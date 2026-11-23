import { prisma } from '@/lib/prisma'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getReconciledAnalytics } from '@/lib/analytics'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const [
    analytics,
    invoices,
    todayRevenue,
    monthRevenue,
    totalRevenue,
    lowStockVariants,
    recentExpenses,
    recentInvoices,
  ] = await Promise.all([
    getReconciledAnalytics(),
    prisma.document.count({ where: { type: 'INVOICE', status: { not: 'VOID' } } }),
    prisma.document.aggregate({
      where: { type: 'INVOICE', status: { not: 'VOID' }, issueDate: { gte: todayStart, lte: todayEnd } },
      _sum: { totalSellPrice: true, netProfit: true }
    }),
    prisma.document.aggregate({
      where: { type: 'INVOICE', status: { not: 'VOID' }, issueDate: { gte: monthStart, lte: monthEnd } },
      _sum: { totalSellPrice: true, netProfit: true, amountPaid: true }
    }),
    prisma.document.aggregate({
      where: { type: 'INVOICE', status: { not: 'VOID' } },
      _sum: { totalSellPrice: true, netProfit: true, amountPaid: true }
    }),
    prisma.variant.findMany({
      where: { stockQty: { lte: 2 }, product: { isService: false } },
      include: { product: { include: { category: true } } },
      orderBy: { stockQty: 'asc' },
      take: 10
    }),
    prisma.expense.findMany({ orderBy: { date: 'desc' }, take: 5 }),
    prisma.document.findMany({
      where: { type: 'INVOICE' },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
  ])

  return (
    <DashboardClient
      initialAnalytics={analytics}
      stats={{
        totalInvoices: invoices,
        todayRevenue: Number(todayRevenue._sum.totalSellPrice ?? 0),
        todayProfit: Number(todayRevenue._sum.netProfit ?? 0),
        monthRevenue: Number(monthRevenue._sum.totalSellPrice ?? 0),
        monthProfit: Number(monthRevenue._sum.netProfit ?? 0),
        monthCollected: Number(monthRevenue._sum.amountPaid ?? 0),
        totalRevenue: Number(totalRevenue._sum.totalSellPrice ?? 0),
        totalProfit: Number(totalRevenue._sum.netProfit ?? 0),
        arBalance: analytics.pendingFunds,
      }}
      lowStockVariants={lowStockVariants.map(v => ({
        id: v.id,
        sku: v.sku,
        productName: v.product.name,
        color: v.color,
        size: v.size,
        stockQty: v.stockQty,
        threshold: v.lowStockThreshold,
      }))}
      recentInvoices={recentInvoices.map(inv => ({
        id: inv.id,
        refNumber: inv.refNumber,
        status: inv.status,
        clientName: inv.client.name,
        totalSellPrice: Number(inv.totalSellPrice),
        netProfit: Number(inv.netProfit),
        issueDate: inv.issueDate.toISOString(),
      }))}
    />
  )
}
