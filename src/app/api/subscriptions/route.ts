import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export async function GET() {
  const subs = await prisma.memberSubscription.findMany({
    orderBy: [{ memberName: 'asc' }, { year: 'desc' }]
  })

  const memberNames = Array.from(new Set(subs.map(s => s.memberName)))
  const months = ['September', 'October', 'November', 'December']

  const matrix = memberNames.map(name => {
    const records = subs.filter(s => s.memberName === name)
    const monthStatus: Record<string, string> = {}
    records.forEach(r => {
      monthStatus[r.month] = r.status
    })
    const totalPaid = records.filter(r => r.status === 'PAID').reduce((sum, r) => sum + Number(r.amount), 0)
    return {
      name,
      months: monthStatus,
      totalPaid,
    }
  })

  return ok({
    matrix,
    months,
    raw: subs.map(s => ({ ...s, amount: Number(s.amount) }))
  })
}
