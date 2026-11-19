'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { formatCurrency, formatPercent } from '@/lib/finance'
import {
  TrendingUp, TrendingDown, Download, Printer, Filter,
  Calendar, ArrowRight, DollarSign, PieChart, FileText
} from 'lucide-react'

export default function ProfitAndLossPage() {
  const [rangePreset, setRangePreset] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  const getDateRange = useCallback(() => {
    const now = new Date()
    if (rangePreset === 'today') {
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
    }
    if (rangePreset === 'week') {
      return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: endOfWeek(now, { weekStartsOn: 1 }).toISOString() }
    }
    if (rangePreset === 'month') {
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() }
    }
    if (rangePreset === 'custom' && customFrom && customTo) {
      return { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() }
    }
    return { from: '', to: '' }
  }, [rangePreset, customFrom, customTo])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const query = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ''
      const res = await fetch(`/api/finance/summary${query}`)
      const json = await res.json()
      setSummary(json.data)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const exportCsv = () => {
    if (!summary) return
    const lines = [
      'PODMYTH - PROFIT & LOSS STATEMENT',
      `Period: ${rangePreset.toUpperCase()}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Category,Amount (USD)',
      `Gross Sales Revenue,$${summary.grossRevenue.toFixed(2)}`,
      `Direct Order Buying Costs (COGS),-$${summary.totalCOGS.toFixed(2)}`,
      `Gross Profit,$${summary.grossProfit.toFixed(2)}`,
      `Gross Profit Margin,${summary.grossMargin.toFixed(1)}%`,
      `General Operating Overheads,-$${summary.totalExpenses.toFixed(2)}`,
      `Net Profit / Loss,$${summary.netProfit.toFixed(2)}`,
      `Net Profit Margin,${summary.netMargin.toFixed(1)}%`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PodMyth_Profit_Loss_${rangePreset}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const isNetLoss = summary ? summary.netProfit < 0 : false

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Profit & Loss (Income Statement)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time financial performance: Gross Sales, COGS, Operating Overheads & Net Profit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Printer size={13} /> Print / Export PDF
          </button>
          <button
            onClick={exportCsv}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="no-print flex flex-wrap items-center gap-2 bg-white border border-[#E5E5E5] p-3">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mr-2 flex items-center gap-1.5">
          <Calendar size={13} /> Period:
        </span>
        {(['all', 'today', 'week', 'month', 'custom'] as const).map(p => (
          <button
            key={p}
            onClick={() => setRangePreset(p)}
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              rangePreset === p ? 'bg-[#111111] text-white' : 'bg-[#F8F9FA] text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Custom'}
          </button>
        ))}

        {rangePreset === 'custom' && (
          <div className="flex items-center gap-2 ml-4">
            <input
              type="date"
              className="input text-xs py-1"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              className="input text-xs py-1"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Printable Financial Statement Container */}
      <div className="bg-white border border-[#E5E5E5] p-8 lg:p-12 shadow-sm print:border-0 print:p-0">
        {/* Brand Header */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-[#111111] mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#C62828] flex items-center justify-center">
                <span className="text-white text-xs font-black">PM</span>
              </div>
              <h2 className="text-xl font-black text-[#111111] tracking-wider uppercase">
                PODMYTH
              </h2>
            </div>
            <p className="text-[10px] font-bold text-[#C62828] tracking-widest uppercase mt-0.5">
              MEDICAL APPAREL & DIAGNOSTIC GEAR
            </p>
          </div>

          <div className="text-right">
            <h3 className="text-lg font-black text-[#111111] tracking-tight uppercase">
              INCOME STATEMENT (P&L)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Period: <span className="font-semibold text-[#111111] uppercase">{rangePreset.replace('_', ' ')}</span>
            </p>
            <p className="text-[11px] text-gray-400">
              Generated: {format(new Date(), 'd MMMM yyyy, HH:mm')}
            </p>
          </div>
        </div>

        {loading || !summary ? (
          <div className="py-16 text-center text-xs text-gray-400">Calculating financial ledger...</div>
        ) : (
          <div className="space-y-6">
            {/* Statement Table */}
            <table className="w-full text-xs">
              <tbody>
                {/* 1. REVENUE SECTION */}
                <tr className="border-b border-[#111111]">
                  <td className="py-2.5 font-black uppercase tracking-wider text-[#111111]" colSpan={2}>
                    1. REVENUE (ACCRUAL BILLED SALES)
                  </td>
                </tr>
                <tr className="hover:bg-[#F8F9FA]">
                  <td className="py-2 pl-4 text-gray-700">Gross Sales (Apparel Scrub Sets, Lab Coats, Jackets)</td>
                  <td className="py-2 text-right font-bold tabular-nums text-[#111111]">
                    {formatCurrency(summary.grossRevenue)}
                  </td>
                </tr>
                <tr className="border-t border-[#E5E5E5] bg-[#F8F9FA]">
                  <td className="py-2.5 font-bold uppercase tracking-wider text-[#111111]">Total Gross Revenue</td>
                  <td className="py-2.5 text-right font-black tabular-nums text-[#111111] text-sm">
                    {formatCurrency(summary.grossRevenue)}
                  </td>
                </tr>

                {/* 2. COST OF GOODS SOLD */}
                <tr className="border-b border-[#111111] pt-4">
                  <td className="pt-6 pb-2.5 font-black uppercase tracking-wider text-[#111111]" colSpan={2}>
                    2. COST OF GOODS SOLD (DIRECT ORDER BUYING COSTS)
                  </td>
                </tr>
                <tr className="hover:bg-[#F8F9FA]">
                  <td className="py-2 pl-4 text-gray-700">Apparel Unit Costs & Outsource Fees (Embroidery, Cuffing, Courier)</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-gray-700">
                    -{formatCurrency(summary.totalCOGS)}
                  </td>
                </tr>
                <tr className="border-t border-[#E5E5E5] bg-[#F8F9FA]">
                  <td className="py-2.5 font-bold uppercase tracking-wider text-gray-800">Total Direct Buying Costs (COGS)</td>
                  <td className="py-2.5 text-right font-black tabular-nums text-gray-700 text-sm">
                    -{formatCurrency(summary.totalCOGS)}
                  </td>
                </tr>

                {/* 3. GROSS PROFIT */}
                <tr className="border-y-2 border-[#111111] bg-gray-50">
                  <td className="py-3 font-black uppercase tracking-wider text-[#111111] text-sm">
                    GROSS PROFIT (REVENUE - COGS)
                  </td>
                  <td className="py-3 text-right font-black tabular-nums text-[#111111] text-base">
                    <div className="flex items-center justify-end gap-2">
                      <span>{formatCurrency(summary.grossProfit)}</span>
                      <span className="text-xs font-bold text-green-700 border border-green-300 px-1.5 py-0.5 bg-green-50">
                        {summary.grossMargin.toFixed(1)}% Margin
                      </span>
                    </div>
                  </td>
                </tr>

                {/* 4. OPERATING EXPENSES */}
                <tr className="border-b border-[#111111]">
                  <td className="pt-6 pb-2.5 font-black uppercase tracking-wider text-[#111111]" colSpan={2}>
                    3. GENERAL OPERATING OVERHEADS
                  </td>
                </tr>
                <tr className="hover:bg-[#F8F9FA]">
                  <td className="py-2 pl-4 text-gray-700">Packaging, Marketing, Equipment, General Transport</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[#C62828]">
                    -{formatCurrency(summary.totalExpenses)}
                  </td>
                </tr>
                <tr className="border-t border-[#E5E5E5] bg-[#F8F9FA]">
                  <td className="py-2.5 font-bold uppercase tracking-wider text-gray-800">Total Operating Expenses</td>
                  <td className="py-2.5 text-right font-black tabular-nums text-[#C62828] text-sm">
                    -{formatCurrency(summary.totalExpenses)}
                  </td>
                </tr>

                {/* 5. NET PROFIT / LOSS */}
                <tr className={`border-y-4 ${isNetLoss ? 'border-[#C62828] bg-red-50/40' : 'border-[#111111] bg-green-50/30'}`}>
                  <td className="py-4 font-black uppercase tracking-wider text-[#111111] text-base">
                    NET PROFIT / LOSS FOR PERIOD
                  </td>
                  <td className="py-4 text-right font-black tabular-nums text-lg">
                    <div className="flex items-center justify-end gap-2">
                      <span className={isNetLoss ? 'text-[#C62828]' : 'text-green-800'}>
                        {formatCurrency(summary.netProfit)}
                      </span>
                      <span className={`text-xs font-black border px-2 py-0.5 ${
                        isNetLoss ? 'bg-red-50 text-[#C62828] border-red-200' : 'bg-green-50 text-green-800 border-green-200'
                      }`}>
                        {summary.netMargin.toFixed(1)}% Net Margin
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Note & Accounting Standards */}
            <div className="pt-6 border-t border-[#E5E5E5] text-[10px] text-gray-400 space-y-1">
              <p>• Billed Revenue is recognized on an accrual basis when an invoice is issued.</p>
              <p>• Buying Costs (COGS) are matched directly to invoiced line items at point of sale.</p>
              <p>• Overhead expenses are recognized on a cash disbursement basis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
