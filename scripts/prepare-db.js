const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
let schema = fs.readFileSync(schemaPath, 'utf8')

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'

if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://') || dbUrl.startsWith('prisma+postgres://')) {
  console.log('[Database Adapter] PostgreSQL connection detected. Target provider: postgresql')
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/g, 'provider = "postgresql"')
} else {
  console.log('[Database Adapter] Local file database detected. Target provider: sqlite')
  schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/g, 'provider = "sqlite"')
}

fs.writeFileSync(schemaPath, schema)
console.log('[Database Adapter] prisma/schema.prisma updated successfully.')
