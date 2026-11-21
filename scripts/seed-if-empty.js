const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    const count = await prisma.product.count()
    if (count === 0) {
      console.log('Database has no products. Running authentic seed...')
      await prisma.$disconnect()
      // Execute the compiled seed.js
      const { main: runSeed } = require('../prisma/seed.js')
      if (typeof runSeed === 'function') {
        await runSeed()
      }
    } else {
      console.log(`Database is already initialized (${count} products found). Skipping seed.`)
      await prisma.$disconnect()
    }
  } catch (err) {
    console.log('Seed check completed:', err.message)
    try {
      await prisma.$disconnect()
    } catch {}
  }
}

main().then(() => {
  process.exit(0)
}).catch(() => {
  process.exit(0)
})
