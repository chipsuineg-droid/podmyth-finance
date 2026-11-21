import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const variantId = searchParams.get('variantId')
  const type = searchParams.get('type')
  const take = parseInt(searchParams.get('take') ?? '200')

  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(variantId ? { variantId } : {}),
      ...(type ? { type } : {}),
    },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  })
  return ok(movements)
}
