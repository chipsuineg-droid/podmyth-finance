import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export async function GET() {
  const stockTakes = await prisma.stockTake.findMany({
    include: { lines: { include: { variant: { include: { product: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  return ok(stockTakes)
}

export async function POST() {
  const variants = await prisma.variant.findMany({
    where: { product: { isService: false } },
    include: { product: true },
  })

  const stockTake = await prisma.stockTake.create({
    data: {
      lines: {
        create: variants.map(v => ({
          variantId: v.id,
          systemCount: v.stockQty,
          physicalCount: v.stockQty,
          variance: 0,
          varianceValue: 0,
        }))
      }
    },
    include: { lines: { include: { variant: { include: { product: true } } } } }
  })
  return ok(stockTake)
}
