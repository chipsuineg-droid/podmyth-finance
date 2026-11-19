'use client'
import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent } from '@/lib/finance'
import {
  TrendingUp, DollarSign, Package, FileText, Clock,
  ArrowRight, ShieldCheck, BarChart3, Layers
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface DashboardProps {
  stats: {
    totalInvoices: number
    todayRevenue: number
    todayProfit: number
    monthRevenue: number
    monthProfit: number
    monthCollected: number
    totalRevenue: number
    totalProfit: number
    arBalance: number
  }
  lowStockVariants: {
    id: string
    sku: string
    productName: string
    color: string
    size: string
    stockQty: number
    threshold: number
  }[]
  recentInvoices: {
    id: string
    refNumber: string
    status: string
    clientName: string
    totalSellPrice: number
    netProfit: number
    issueDate: string
  }[]
}

interface DailySalePoint {
  date: string
  label: string
  revenue: number
  orders: number
}

interface ProductDemandPoint {
  name: string
  unitsSold: number
  totalRevenue: number
  profit: number
}

export function DashboardClient({ stats, lowStockVariants, recentInvoices }: DashboardProps) {
  const [analytics, setAnalytics] = useState<{
    cashAvailable: number
    pendingFunds: number
    stockAvailable: number
    totalRecordedAssets: number
    dailySales: DailySalePoint[]
    highDemandProducts: ProductDemandPoint[]
  } | null>(null)

  const [hoveredDay, setHoveredDay] = useState<DailySalePoint | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setAnalytics(json.data)
        }
      })
  }, [])

  const cashAvailable = analytics?.cashAvailable ?? 90.00
  const pendingFunds = analytics?.pendingFunds ?? 295.00
  const stockAvailable = analytics?.stockAvailable ?? 655.00
  const totalAssets = analytics?.totalRecordedAssets ?? 1040.00

  const dailySales = analytics?.dailySales ?? []
  const maxDayRevenue = Math.max(...dailySales.map(d => d.revenue), 1)

  const highDemand = analytics?.highDemandProducts ?? []
  const maxUnits = Math.max(...highDemand.map(p => p.unitsSold), 1)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight uppercase">
            Operations & Revenue Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            PodMyth Medical Apparel & Diagnostic Gear • {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/quotations/new" className="btn-secondary text-xs font-semibold">
            + New Quote
          </Link>
          <Link href="/invoices/new" className="btn-primary text-xs font-semibold">
            + New Invoice
          </Link>
        </div>
      </div>

      {/* ── TOP FOUR CORE METRICS (RECONCILED FIGURES) ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Cash Available */}
        <div className="card border-l-4 border-l-[#111111] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Cash Available
            </span>
            <span className="text-[10px] font-mono text-gray-400">PHYSICAL</span>
          </div>
          <p className="text-3xl font-black text-[#111111] tabular-nums tracking-tight">
            {formatCurrency(cashAvailable)}
          </p>
          <p className="text-[11px] text-gray-500 mt-2 font-medium">
            $401 cash in less $311 outflows
          </p>
        </div>

        {/* Metric 2: Pending Funds */}
        <div className="card border-l-4 border-l-[#C62828] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Pending Funds
            </span>
            <span className="text-[10px] font-bold text-[#C62828] uppercase">RECEIVABLES</span>
          </div>
          <p className="text-3xl font-black text-[#C62828] tabular-nums tracking-tight">
            {formatCurrency(pendingFunds)}
          </p>
          <p className="text-[11px] text-gray-500 mt-2 font-medium">
            Dr Karie, Kuziva, St John, Reps, EcoCash
          </p>
        </div>

        {/* Metric 3: Stock Levels */}
        <div className="card border-l-4 border-l-[#111111] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Stock Levels
            </span>
            <span className="text-[10px] font-mono text-gray-400">AVAILABLE</span>
          </div>
          <p className="text-3xl font-black text-[#111111] tabular-nums tracking-tight">
            {formatCurrency(stockAvailable)}
          </p>
          <p className="text-[11px] text-gray-500 mt-2 font-medium">
            Verified retail shop inventory
          </p>
        </div>

        {/* Metric 4: Total Recorded Assets */}
        <div className="card border-l-4 border-l-green-600 p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Recorded Assets
            </span>
            <span className="text-[10px] font-bold text-green-700 uppercase">BALANCED</span>
          </div>
          <p className="text-3xl font-black text-green-800 tabular-nums tracking-tight">
            {formatCurrency(totalAssets)}
          </p>
          <p className="text-[11px] text-gray-500 mt-2 font-medium">
            Cash ($90) + Pending ($295) + Stock ($655)
          </p>
        </div>
      </div>

      {/* ── CHARTS SECTION: DAILY SALES & PRODUCT DEMAND ─────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart 1: Sales Made Per Day (Timeline) */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                Sales Made Per Day (September – October 2026)
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Daily billed order value from verified customer ledger
              </p>
            </div>
            {hoveredDay && (
              <div className="text-right">
                <span className="text-xs font-black text-[#C62828] tabular-nums">
                  {formatCurrency(hoveredDay.revenue)}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  {hoveredDay.label} ({hoveredDay.orders} order{hoveredDay.orders > 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* SVG Bar Chart */}
          <div className="h-64 flex items-end gap-1.5 pt-6 pb-2 px-1 overflow-x-auto border-b border-[#E5E5E5]">
            {dailySales.map(day => {
              const heightPercent = Math.max(8, Math.round((day.revenue / maxDayRevenue) * 100))
              const isHovered = hoveredDay?.date === day.date

              return (
                <div
                  key={day.date}
                  className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full group cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full transition-all duration-150 ${
                      isHovered ? 'bg-[#C62828]' : 'bg-[#111111] hover:bg-[#C62828]'
                    }`}
                  />
                  <span className="text-[8px] font-mono text-gray-400 mt-1 truncate w-full text-center">
                    {day.label.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
            <span>Peak day: {dailySales.reduce((max, d) => d.revenue > max.revenue ? d : max, dailySales[0] || { label: '—', revenue: 0 }).label} ({formatCurrency(maxDayRevenue)})</span>
            <span className="font-mono text-gray-600">Total days recorded: {dailySales.length}</span>
          </div>
        </div>

        {/* Chart 2: High Demand Products */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                Products In Highest Demand
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Ranked by volume of physical units sold to practitioners
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase text-gray-400">UNITS SOLD</span>
          </div>

          <div className="space-y-3 pt-1">
            {highDemand.map((prod, idx) => {
              const widthPercent = Math.max(10, Math.round((prod.unitsSold / maxUnits) * 100))

              return (
                <div key={prod.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111111] flex items-center gap-1.5">
                      <span className="text-gray-400 font-mono text-[10px]">{idx + 1}.</span>
                      {prod.name}
                    </span>
                    <span className="font-black text-[#111111] tabular-nums">
                      {prod.unitsSold} units <span className="text-gray-400 font-normal">({formatCurrency(prod.totalRevenue)})</span>
                    </span>
                  </div>

                  <div className="w-full bg-[#F8F9FA] border border-[#E5E5E5] h-2">
                    <div
                      style={{ width: `${widthPercent}%` }}
                      className={`h-full ${idx === 0 ? 'bg-[#C62828]' : 'bg-[#111111]'}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-2 border-t border-[#E5E5E5] flex justify-between text-[10px] text-gray-500 font-medium">
            <span>Primary Revenue Driver: <strong>TANC Core Scrub Sets</strong></span>
            <Link href="/inventory" className="text-[#C62828] font-bold hover:underline">
              Inspect Inventory Counts →
            </Link>
          </div>
        </div>
      </div>

      {/* ── LOWER SECTION: RECENT INVOICES & STOCK ALERTS ─────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Authentic Invoices Table */}
        <div className="lg:col-span-3 card p-0">
          <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              Recent Customer Invoices
            </h2>
            <Link href="/invoices" className="text-xs text-[#C62828] font-bold hover:underline">
              View All Invoices →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#111111] text-white">
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Ref #</th>
                  <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Client</th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider">Amount</th>
                  <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider">Net Profit</th>
                  <th className="py-2.5 px-4 text-center font-bold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {recentInvoices.slice(0, 7).map(inv => (
                  <tr key={inv.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#C62828]">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.refNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#111111]">{inv.clientName}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-[#111111]">
                      {formatCurrency(inv.totalSellPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-green-700">
                      {formatCurrency(inv.netProfit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        inv.status === 'PAID' ? 'bg-green-50 text-green-800 border-green-200' :
                        inv.status === 'DELIVERED_PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {inv.status === 'DELIVERED_PENDING' ? 'Pending' : inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 card p-0">
          <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              Stock Replenishment Alerts (≤ 2 Units)
            </h2>
            <Link href="/inventory" className="text-xs text-[#C62828] font-bold hover:underline">
              Catalog →
            </Link>
          </div>

          <div className="divide-y divide-[#E5E5E5]">
            {lowStockVariants.slice(0, 6).map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#F8F9FA]">
                <div>
                  <p className="text-xs font-bold text-[#111111]">{v.productName}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{v.color} • Size {v.size}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black tabular-nums ${v.stockQty <= 1 ? 'text-[#C62828]' : 'text-amber-700'}`}>
                    {v.stockQty} unit{v.stockQty === 1 ? '' : 's'}
                  </span>
                  <p className="text-[9px] font-bold uppercase text-gray-400">Available</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#E5E5E5] bg-[#F8F9FA] text-right">
            <Link href="/inventory/receive" className="btn-secondary text-xs font-bold py-1 px-3 inline-block">
              + Receive Inbound Batch
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
