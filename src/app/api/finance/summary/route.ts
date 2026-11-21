import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
  const dateFilter = from || to ? { gte: from, lte: to } : undefined

  const [invoiceAgg, paymentAgg, expenseAgg, paymentsByMethod] = await Promise.all([
    prisma.document.aggregate({
      where: { type: 'INVOICE', status: { not: 'VOID' }, ...(dateFilter ? { issueDate: dateFilter } : {}) },
      _sum: { totalSellPrice: true, totalBuyPrice: true, netProfit: true, amountPaid: true },
    }),
    prisma.payment.aggregate({
      where: dateFilter ? { paidAt: dateFilter } : {},
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: dateFilter ? { date: dateFilter } : {},
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ['method'],
      where: dateFilter ? { paidAt: dateFilter } : {},
      _sum: { amount: true },
    }),
  ])

  const ar = await prisma.document.aggregate({
    where: { type: 'INVOICE', status: { in: ['DELIVERED_PENDING', 'PARTIAL'] }, ...(dateFilter ? { issueDate: dateFilter } : {}) },
    _sum: { totalSellPrice: true, amountPaid: true },
  })

  const variants = await prisma.variant.findMany({
    where: { product: { isService: false } },
    select: { stockQty: true, defaultSellPrice: true }
  })
  const inventoryValue = variants.reduce((s, v) => s + v.stockQty * Number(v.defaultSellPrice), 0)

  const grossRevenue = Number(invoiceAgg._sum.totalSellPrice ?? 0)
  const totalCOGS = Number(invoiceAgg._sum.totalBuyPrice ?? 0)
  const grossProfit = Number(invoiceAgg._sum.netProfit ?? 0)
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0)
  const netProfit = grossProfit - totalExpenses
  const totalCollected = Number(paymentAgg._sum.amount ?? 0)
  const arBalance = Number(ar._sum.totalSellPrice ?? 0) - Number(ar._sum.amountPaid ?? 0)

  return ok({
    grossRevenue, totalCOGS, grossProfit,
    grossMargin: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
    totalExpenses, netProfit,
    netMargin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
    totalCollected, arBalance, inventoryValue,
    paymentsByMethod: paymentsByMethod.map(p => ({ method: p.method, amount: Number(p._sum.amount ?? 0) })),
  })
}
