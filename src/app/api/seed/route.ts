import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Run the authentic seed script
    const path = await import('path')
    const seedPath = path.join(process.cwd(), 'prisma', 'seed.js')
    const { main: runSeed } = require(seedPath)
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
