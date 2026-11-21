const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  try {
    const [productCount, documentCount] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.document.count().catch(() => 0),
    ])

    if (productCount === 0 || documentCount === 0) {
      console.log('[Seed] Database uninitialized. Synchronizing authentic PodMyth database baseline...')
      const seedScript = path.join(__dirname, '..', 'prisma', 'seed.js')
      execSync(`node "${seedScript}"`, { stdio: 'inherit' })
      console.log('[Seed] Baseline established.')
    } else {
      console.log(`[Seed] Database already contains ${productCount} products and ${documentCount} documents. Preserving active transaction records.`)
    }
  } catch (err) {
    console.error('[Seed Error]:', err.message)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

main().then(() => {
  process.exit(0)
}).catch((e) => {
  console.error(e)
  process.exit(0)
})
