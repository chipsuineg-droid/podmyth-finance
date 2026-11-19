import { prisma } from './prisma'

export async function getNextRefNumber(type: 'QUOTATION' | 'INVOICE'): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = type === 'QUOTATION' ? 'PM-QT' : 'PM-INV'

  const seq = await prisma.sequence.upsert({
    where: { id: type },
    update: { counter: { increment: 1 }, year },
    create: { id: type, year, counter: 1 },
  })

  // Reset counter if year changed
  if (seq.year !== year) {
    await prisma.sequence.update({
      where: { id: type },
      data: { year, counter: 1 }
    })
    return `${prefix}-${year}-001`
  }

  return `${prefix}-${year}-${String(seq.counter).padStart(3, '0')}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`
}

export function calcProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  return ((revenue - cost) / revenue) * 100
}

export interface LineItem {
  variantId?: string | null
  description: string
  notes?: string
  qty: number
  buyingPrice: number
  sellingPrice: number
}

export function calcOrderTotals(items: LineItem[]) {
  const totalSellPrice = items.reduce((s, i) => s + i.qty * i.sellingPrice, 0)
  const totalBuyPrice = items.reduce((s, i) => s + i.qty * i.buyingPrice, 0)
  const netProfit = totalSellPrice - totalBuyPrice
  const profitMargin = calcProfitMargin(totalSellPrice, totalBuyPrice)
  return { totalSellPrice, totalBuyPrice, netProfit, profitMargin }
}
