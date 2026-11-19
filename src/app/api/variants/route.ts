import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const q = searchParams.get('q') ?? ''

  const variants = await prisma.variant.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(q ? {
        OR: [
          { product: { name: { contains: q } } },
          { color: { contains: q } },
          { sku: { contains: q } },
        ]
      } : {}),
    },
    include: { product: { include: { category: true } } },
    orderBy: [{ product: { name: 'asc' } }, { color: 'asc' }, { size: 'asc' }],
    take: 100,
  })
  return ok(variants)
}
