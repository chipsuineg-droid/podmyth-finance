import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const requestedMonth = searchParams.get('month') || '2026-10'

  // Discover all months available in documents, payments, and expenses
  const [docDates, payDates, expDates] = await Promise.all([
    prisma.document.findMany({ select: { issueDate: true }, orderBy: { issueDate: 'desc' } }),
    prisma.payment.findMany({ select: { paidAt: true }, orderBy: { paidAt: 'desc' } }),
    prisma.expense.findMany({ select: { date: true }, orderBy: { date: 'desc' } }),
  ])

  const monthSet = new Set<string>()
  // Always include key months
  monthSet.add('2026-10')
  monthSet.add('2026-09')
  monthSet.add('2026-11')
  docDates.forEach(d => monthSet.add(format(new Date(d.issueDate), 'yyyy-MM')))
  payDates.forEach(p => monthSet.add(format(new Date(p.paidAt), 'yyyy-MM')))
  expDates.forEach(e => monthSet.add(format(new Date(e.date), 'yyyy-MM')))

  const availableMonths = Array.from(monthSet)
    .sort((a, b) => b.localeCompare(a))
    .map(m => {
      const [y, mo] = m.split('-')
      const d = new Date(Number(y), Number(mo) - 1, 1)
      return {
        value: m,
        label: format(d, 'MMMM yyyy'),
        isOfficial: m === '2026-10',
      }
    })

  const isOfficialOctober = requestedMonth === '2026-10'
  const [yearStr, monthStr] = requestedMonth.split('-')
  const startDate = startOfMonth(new Date(Number(yearStr), Number(monthStr) - 1, 1))
  const endDate = endOfMonth(startDate)
  const monthLabel = format(startDate, 'MMMM yyyy')

  // Common queries for stock and action points
  const [physicalVariants, actionPoints] = await Promise.all([
    prisma.variant.findMany({
      where: { product: { isService: false } },
      include: { product: { include: { category: true } } },
    }),
    prisma.actionPoint.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  const liveStockValue = physicalVariants.reduce(
    (sum, v) => sum + v.stockQty * Number(v.defaultSellPrice),
    0
  )

  // Monthly documents (Invoices)
  const monthInvoices = await prisma.document.findMany({
    where: {
      type: 'INVOICE',
      status: { not: 'VOID' },
      issueDate: { gte: startDate, lte: endDate },
    },
    include: {
      client: true,
      items: true,
    },
    orderBy: { issueDate: 'desc' },
  })

  // Trading P&L for requested month
  const grossRevenue = monthInvoices.reduce((s, inv) => s + Number(inv.totalSellPrice), 0)
  const totalCOGS = monthInvoices.reduce((s, inv) => s + Number(inv.totalBuyPrice), 0)
  const grossProfit = grossRevenue - totalCOGS
  const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0

  // Product movements for this month
  const productMoveMap: Record<string, { name: string; unitsSold: number; revenue: number; cogs: number; profit: number }> = {}
  monthInvoices.forEach(inv => {
    inv.items.forEach(it => {
      const clean = it.description.split('–')[0].split('-')[0].trim()
      if (!productMoveMap[clean]) {
        productMoveMap[clean] = { name: clean, unitsSold: 0, revenue: 0, cogs: 0, profit: 0 }
      }
      productMoveMap[clean].unitsSold += it.qty
      productMoveMap[clean].revenue += Number(it.lineTotal)
      productMoveMap[clean].cogs += Number(it.lineCost)
      productMoveMap[clean].profit += Number(it.lineProfit)
    })
  })
  const topProducts = Object.values(productMoveMap).sort((a, b) => b.unitsSold - a.unitsSold)

  // Monthly Expenses (Outflows)
  const monthExpenses = await prisma.expense.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
  })
  const totalOperatingExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const netTradingProfit = grossProfit - totalOperatingExpenses
  const netMargin = grossRevenue > 0 ? (netTradingProfit / grossRevenue) * 100 : 0

  // Monthly Payments (Inflows)
  const monthPayments = await prisma.payment.findMany({
    where: { paidAt: { gte: startDate, lte: endDate } },
    include: { document: { include: { client: true } } },
    orderBy: { paidAt: 'asc' },
  })

  // Pending receivables up to the end of this month
  const pendingInvoices = await prisma.document.findMany({
    where: {
      type: 'INVOICE',
      status: { in: ['DELIVERED_PENDING', 'PARTIAL'] },
      issueDate: { lte: endDate },
    },
    include: { client: true },
    orderBy: { issueDate: 'asc' },
  })

  // ───────────────────────────────────────────────────────────────────────────
  // OFFICIAL OCTOBER 2026 AUDIT SPECIFIC MAPPING
  // ───────────────────────────────────────────────────────────────────────────
  if (isOfficialOctober) {
    const stockInventoryValue = 694.00
    const initialCashInHand = 329.00
    const geniusPayments = 67.00
    const penTorchSale = 5.00
    const shawnCashIn = 25.00
    const ecoCashWithdrawal = 48.00
    const drKarieSettlement = 155.00
    const kuzivaSettlement = 55.00
    const totalCashReceived = 384.00
    const totalCashOutflows = 0.00 // Operating expenses reset to zero baseline

    const actualCashPosition = 384.00  // Physical cash in hand ($384.00 clean baseline)
    const totalPendingFunds = 32.00    // St John ($30) + Dr. Tawo ($2)
    const totalRecordedAssets = 1110.00 // $384 + $32 + $694

    const officialInflowItems = [
      { source: 'Reconciled Cash in Hand Baseline', amount: 384.00, method: 'USD CASH', date: '2026-10-31' },
    ]

    const officialOutflowItems: { description: string; category: string; amount: number; date: string }[] = []

    const officialUnbankedFunds: { description: string; amount: number; status: string }[] = []

    return ok({
      month: requestedMonth,
      monthLabel,
      isOfficialOctober: true,
      availableMonths,
      // 4 Pillar Fund Standpoint
      cashAvailable: actualCashPosition,
      pendingFunds: totalPendingFunds,
      stockInventoryValue,
      totalRecordedAssets,
      // Cash Statement
      openingCash: actualCashPosition,
      inflowItems: officialInflowItems,
      totalCashReceived,
      outflowItems: officialOutflowItems,
      totalCashOutflows,
      netCashFlow: totalCashReceived - totalCashOutflows,
      // Receivables
      unbankedFunds: officialUnbankedFunds,
      pendingInvoices: pendingInvoices.map(inv => ({
        id: inv.id,
        refNumber: inv.refNumber,
        clientName: inv.client.name,
        issueDate: format(new Date(inv.issueDate), 'dd MMM yyyy'),
        total: Number(inv.totalSellPrice),
        paid: Number(inv.amountPaid),
        pending: Number(inv.totalSellPrice) - Number(inv.amountPaid),
        status: inv.status,
      })),
      // Trading Performance
      trading: {
        grossRevenue,
        totalCOGS,
        grossProfit,
        grossMargin,
        operatingExpenses: totalCashOutflows,
        netProfit: grossProfit - totalCashOutflows,
        netMargin: grossRevenue > 0 ? ((grossProfit - totalCashOutflows) / grossRevenue) * 100 : 0,
        invoicesCount: monthInvoices.length,
      },
      topProducts,
      actionPoints,
    })
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DYNAMIC COMPUTATION FOR ANY OTHER MONTH
  // ───────────────────────────────────────────────────────────────────────────
  // Opening cash = all payments prior to this month minus all expenses prior
  const [priorPayments, priorExpenses] = await Promise.all([
    prisma.payment.aggregate({
      where: { paidAt: { lt: startDate } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { lt: startDate } },
      _sum: { amount: true },
    }),
  ])
  const openingCash = Math.max(0, Number(priorPayments._sum.amount ?? 0) - Number(priorExpenses._sum.amount ?? 0))

  const totalCashReceived = monthPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalCashOutflows = totalOperatingExpenses
  const closingCash = openingCash + totalCashReceived - totalCashOutflows

  const totalPendingInvoices = pendingInvoices.reduce(
    (s, inv) => s + (Number(inv.totalSellPrice) - Number(inv.amountPaid)),
    0
  )

  const inflowItems = monthPayments.map(p => ({
    source: p.document?.client?.name ? `${p.document.client.name} (${p.document.refNumber})` : (p.notes || 'Direct Payment'),
    amount: Number(p.amount),
    method: p.method,
    date: format(new Date(p.paidAt), 'yyyy-MM-dd'),
    ref: p.document?.refNumber,
  }))

  const outflowItems = monthExpenses.map(e => ({
    description: e.description,
    category: e.category,
    amount: Number(e.amount),
    date: format(new Date(e.date), 'yyyy-MM-dd'),
  }))

  const totalRecordedAssets = closingCash + totalPendingInvoices + liveStockValue

  return ok({
    month: requestedMonth,
    monthLabel,
    isOfficialOctober: false,
    availableMonths,
    // 4 Pillar Fund Standpoint
    cashAvailable: closingCash,
    pendingFunds: totalPendingInvoices,
    stockInventoryValue: liveStockValue,
    totalRecordedAssets,
    // Cash Statement
    openingCash,
    inflowItems,
    totalCashReceived,
    outflowItems,
    totalCashOutflows,
    netCashFlow: totalCashReceived - totalCashOutflows,
    // Receivables
    unbankedFunds: [],
    pendingInvoices: pendingInvoices.map(inv => ({
      id: inv.id,
      refNumber: inv.refNumber,
      clientName: inv.client.name,
      issueDate: format(new Date(inv.issueDate), 'dd MMM yyyy'),
      total: Number(inv.totalSellPrice),
      paid: Number(inv.amountPaid),
      pending: Number(inv.totalSellPrice) - Number(inv.amountPaid),
      status: inv.status,
    })),
    // Trading Performance
    trading: {
      grossRevenue,
      totalCOGS,
      grossProfit,
      grossMargin,
      operatingExpenses: totalOperatingExpenses,
      netProfit: netTradingProfit,
      netMargin,
      invoicesCount: monthInvoices.length,
    },
    topProducts,
    actionPoints,
  })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, status } = body

  if (!id) return err('ID is required')

  const updated = await prisma.actionPoint.update({
    where: { id },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  })

  return ok(updated)
}
