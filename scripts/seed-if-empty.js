const { execSync } = require('child_process')
const path = require('path')

async function main() {
  try {
    console.log('[Seed] Synchronizing authentic PodMyth database baseline...')
    const seedScript = path.join(__dirname, '..', 'prisma', 'seed.js')
    execSync(`node "${seedScript}"`, { stdio: 'inherit' })
    console.log('[Seed] Database baseline synchronization completed successfully.')
  } catch (err) {
    console.error('[Seed Error]:', err.message)
  }
}

main().then(() => {
  process.exit(0)
}).catch((e) => {
  console.error(e)
  process.exit(0)
})
