import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const force = searchParams.get('force') === 'true'

  try {
    const existingCount = await prisma.product.count()
    if (existingCount > 0 && !force) {
      return ok({
        message: 'Database is already initialized.',
        productCount: existingCount,
        seeded: false,
      })
    }

    // Run the authentic seed script
    const { main: runSeed } = require('../../../../../prisma/seed.js')
    await runSeed()

    const [productCount, invoiceCount, variantCount] = await Promise.all([
      prisma.product.count(),
      prisma.document.count({ where: { type: 'INVOICE' } }),
      prisma.variant.count({ where: { product: { isService: false } } }),
    ])

    return ok({
      message: 'Authentic PodMyth database initialized successfully.',
      seeded: true,
      productCount,
      invoiceCount,
      variantCount,
    })
  } catch (error: any) {
    console.error('Seed API error:', error)
    return err(error.message || 'Failed to seed database', 500)
  }
}

export async function POST(req: Request) {
  return GET(req)
}
