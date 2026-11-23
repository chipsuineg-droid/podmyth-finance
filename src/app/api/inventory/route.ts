import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidateAllFinancialViews } from '@/lib/reconciliation'

const ReceiveSchema = z.object({
  variantId: z.string(),
  qty: z.number().int().positive(),
  buyingPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  supplier: z.string().optional(),
  notes: z.string().optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lowStock = searchParams.get('lowStock') === 'true'
  const categoryId = searchParams.get('categoryId')

  const variants = await prisma.variant.findMany({
    where: {
      product: {
        isService: false,
        ...(categoryId ? { categoryId } : {}),
      },
      ...(lowStock ? { stockQty: { lte: 2 } } : {}),
    },
    include: { product: { include: { category: true } } },
    orderBy: [{ product: { name: 'asc' } }, { color: 'asc' }, { size: 'asc' }],
  })
  return ok(variants)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = ReceiveSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const { variantId, qty, buyingPrice, sellingPrice, supplier, notes } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update variant stock
    const variant = await tx.variant.update({
      where: { id: variantId },
      data: {
        stockQty: { increment: qty },
        defaultBuyPrice: new Decimal(buyingPrice),
        defaultSellPrice: new Decimal(sellingPrice),
      }
    })

    // 2. Log INBOUND stock movement
    const movement = await tx.stockMovement.create({
      data: {
        variantId,
        type: 'INBOUND',
        qty,
        buyingPrice: new Decimal(buyingPrice),
        sellingPrice: new Decimal(sellingPrice),
        supplier,
        notes: notes || 'Shipment received',
      }
    })

    // 3. Scan ORDER_PRESSED quotations and update to STOCK_READY if stock is now sufficient
    const pressedQuotes = await tx.document.findMany({
      where: { type: 'QUOTATION', status: 'ORDER_PRESSED' },
      include: { items: { include: { variant: true } } }
    })

    for (const quote of pressedQuotes) {
      let allInStock = true
      for (const it of quote.items) {
        if (!it.variantId) {
          allInStock = false
          break
        }
        // Fetch latest stock if it was the variant updated, or check current
        const currentQty = it.variantId === variantId ? variant.stockQty : (it.variant?.stockQty ?? 0)
        if (currentQty < it.qty) {
          allInStock = false
          break
        }
      }
      if (allInStock) {
        await tx.document.update({
          where: { id: quote.id },
          data: { status: 'STOCK_READY' }
        })
      }
    }

    return { variant, movement }
  })

  revalidateAllFinancialViews()
  return ok(result)
}
