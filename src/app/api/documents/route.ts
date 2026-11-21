import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { getNextRefNumber, calcOrderTotals } from '@/lib/finance'

const ItemSchema = z.object({
  variantId: z.string().optional().nullable(),
  description: z.string().min(1),
  notes: z.string().optional(),
  qty: z.number().int().positive(),
  buyingPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  sortOrder: z.number().int().optional(),
})

const DocumentSchema = z.object({
  type: z.enum(['QUOTATION', 'INVOICE']),
  clientId: z.string(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(ItemSchema).min(1),
  allowBackorder: z.boolean().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const q = searchParams.get('q') ?? ''

  const docs = await prisma.document.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
      ...(q ? { OR: [{ refNumber: { contains: q } }, { client: { name: { contains: q } } }] } : {}),
    },
    include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return ok(docs)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = DocumentSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const { type, clientId, issueDate, dueDate, notes, items, allowBackorder } = parsed.data

  if (type === 'INVOICE') {
    for (const item of items) {
      if (!item.variantId) continue
      const variant = await prisma.variant.findUnique({ where: { id: item.variantId }, include: { product: true } })
      if (!variant || variant.product.isService) continue
      if (variant.stockQty < item.qty && !allowBackorder) {
        return err(`Insufficient stock for "${item.description}". Available: ${variant.stockQty}, Requested: ${item.qty}`)
      }
    }
  }

  const refNumber = await getNextRefNumber(type)
  const totals = calcOrderTotals(items)

  const doc = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        refNumber,
        type,
        status: type === 'INVOICE' ? 'ISSUED' : 'DRAFT',
        clientId,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
        totalSellPrice: new Decimal(totals.totalSellPrice),
        totalBuyPrice: new Decimal(totals.totalBuyPrice),
        netProfit: new Decimal(totals.netProfit),
        profitMargin: new Decimal(totals.profitMargin),
        items: {
          create: items.map((item, idx) => ({
            variantId: item.variantId ?? undefined,
            description: item.description,
            notes: item.notes,
            qty: item.qty,
            buyingPrice: new Decimal(item.buyingPrice),
            sellingPrice: new Decimal(item.sellingPrice),
            lineTotal: new Decimal(item.qty * item.sellingPrice),
            lineCost: new Decimal(item.qty * item.buyingPrice),
            lineProfit: new Decimal(item.qty * (item.sellingPrice - item.buyingPrice)),
            sortOrder: item.sortOrder ?? idx,
          }))
        }
      },
      include: { items: true, client: true }
    })

    if (type === 'INVOICE') {
      for (const item of items) {
        if (!item.variantId) continue
        const variant = await tx.variant.findUnique({ where: { id: item.variantId }, include: { product: true } })
        if (!variant || variant.product.isService) continue
        await tx.variant.update({ where: { id: item.variantId }, data: { stockQty: { decrement: item.qty } } })
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId, type: 'SALE', qty: -item.qty,
            buyingPrice: new Decimal(item.buyingPrice), sellingPrice: new Decimal(item.sellingPrice),
            referenceId: document.id,
          }
        })
      }
    }
    return document
  })

  return ok(doc)
}
