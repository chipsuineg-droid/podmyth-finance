const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')
const path = require('path')

async function main() {
  const prisma = new PrismaClient()
  try {
    const count = await prisma.product.count()
    console.log(`[Seed Check] Current product count in database: ${count}`)
    if (count === 0) {
      console.log('[Seed Check] Database is empty. Running authentic PodMyth seed...')
      await prisma.$disconnect()
      const seedScript = path.join(__dirname, '..', 'prisma', 'seed.js')
      execSync(`node "${seedScript}"`, { stdio: 'inherit' })
      console.log('[Seed Check] Seed script completed successfully.')
    } else {
      console.log(`[Seed Check] Database already has ${count} products. Skipping seed.`)
      await prisma.$disconnect()
    }
  } catch (err) {
    console.error('[Seed Check Error]:', err.message)
    try {
      await prisma.$disconnect()
    } catch {}
  }
}

main().then(() => {
  process.exit(0)
}).catch((e) => {
  console.error(e)
  process.exit(0)
})
