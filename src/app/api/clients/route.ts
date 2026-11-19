import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  const clients = await prisma.client.findMany({
    where: q ? { name: { contains: q } } : {},
    include: {
      documents: {
        where: { type: 'INVOICE', status: { not: 'VOID' } },
        select: { totalSellPrice: true, netProfit: true, amountPaid: true, status: true }
      }
    },
    orderBy: { name: 'asc' },
  })

  const result = clients.map(c => ({
    ...c,
    totalRevenue: c.documents.reduce((s, d) => s + Number(d.totalSellPrice), 0),
    totalProfit: c.documents.reduce((s, d) => s + Number(d.netProfit), 0),
    totalCollected: c.documents.reduce((s, d) => s + Number(d.amountPaid), 0),
    arBalance: c.documents
      .filter(d => d.status === 'DELIVERED_PENDING' || d.status === 'PARTIAL')
      .reduce((s, d) => s + Number(d.totalSellPrice) - Number(d.amountPaid), 0),
    orderCount: c.documents.length,
  }))
  return ok(result)
}

export async function POST(req: Request) {
  const body = await req.json()
  const client = await prisma.client.create({ data: body })
  return ok(client)
}
