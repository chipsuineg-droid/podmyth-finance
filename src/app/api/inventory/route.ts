import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

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
    const variant = await tx.variant.update({
      where: { id: variantId },
      data: {
        stockQty: { increment: qty },
        defaultBuyPrice: new Decimal(buyingPrice),
        defaultSellPrice: new Decimal(sellingPrice),
      }
    })
    const movement = await tx.stockMovement.create({
      data: { variantId, type: 'INBOUND', qty, buyingPrice: new Decimal(buyingPrice), sellingPrice: new Decimal(sellingPrice), supplier, notes }
    })
    return { variant, movement }
  })
  return ok(result)
}
