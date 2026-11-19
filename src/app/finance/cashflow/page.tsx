'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { Download, Printer, DollarSign, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react'

export default function CashFlowPage() {
  const [rangePreset, setRangePreset] = useState<'all' | 'month' | 'week'>('all')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/summary`)
      const json = await res.json()
      setSummary(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const exportCsv = () => {
    if (!summary) return
    const lines = [
      'PODMYTH - CASH FLOW STATEMENT',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Category,Amount (USD)',
      `Total Cash Inflows (Collected),+$${summary.totalCollected.toFixed(2)}`,
      `Cash Outflows (COGS & Overheads),-$${(summary.totalCOGS + summary.totalExpenses).toFixed(2)}`,
      `Net Cash Flow,$${(summary.totalCollected - (summary.totalCOGS + summary.totalExpenses)).toFixed(2)}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PodMyth_Cash_Flow_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const outflows = summary ? summary.totalCOGS + summary.totalExpenses : 0
  const netCashFlow = summary ? summary.totalCollected - outflows : 0

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">Statement of Cash Flows</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Operating Cash Inflows by payment method (USD Cash, EcoCash, InnBucks, Nostro) vs Cash Outflows
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary text-xs flex items-center gap-1.5">
            <Printer size={13} /> Print / Export PDF
          </button>
          <button onClick={exportCsv} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Statement Container */}
      <div className="bg-white border border-[#E5E5E5] p-8 lg:p-12 shadow-sm print:border-0 print:p-0">
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
              STATEMENT OF CASH FLOWS
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">All-Time Cumulative Operating Cash</p>
            <p className="text-[11px] text-gray-400">Generated: {format(new Date(), 'd MMMM yyyy')}</p>
          </div>
        </div>

        {loading || !summary ? (
          <div className="py-16 text-center text-xs text-gray-400">Calculating cash flows...</div>
        ) : (
          <div className="space-y-6">
            <table className="w-full text-xs">
              <tbody>
                {/* INFLOWS */}
                <tr className="border-b border-[#111111]">
                  <td className="py-2.5 font-black uppercase tracking-wider text-[#111111]" colSpan={2}>
                    1. CASH INFLOWS FROM CUSTOMERS (COLLECTED REVENUE)
                  </td>
                </tr>
                {(summary.paymentsByMethod || []).map((p: any) => (
                  <tr key={p.method} className="hover:bg-[#F8F9FA]">
                    <td className="py-2 pl-4 text-gray-700">Payment Channel: {p.method.replace('_', ' ')}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-green-700">
                      +{formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
                {(summary.paymentsByMethod || []).length === 0 && (
                  <tr>
                    <td className="py-2 pl-4 text-gray-400 italic">No receipts recorded</td>
                    <td className="py-2 text-right text-gray-400">$0.00</td>
                  </tr>
                )}
                <tr className="border-t border-[#E5E5E5] bg-[#F8F9FA]">
                  <td className="py-2.5 font-bold uppercase tracking-wider text-[#111111]">Total Cash Inflows</td>
                  <td className="py-2.5 text-right font-black tabular-nums text-green-800 text-sm">
                    +{formatCurrency(summary.totalCollected)}
                  </td>
                </tr>

                {/* OUTFLOWS */}
                <tr className="border-b border-[#111111]">
                  <td className="pt-6 pb-2.5 font-black uppercase tracking-wider text-[#111111]" colSpan={2}>
                    2. CASH OUTFLOWS (PURCHASES & OVERHEAD EXPENSES)
                  </td>
                </tr>
                <tr className="hover:bg-[#F8F9FA]">
                  <td className="py-2 pl-4 text-gray-700">Apparel Stock Purchases & Direct Tailor/Embroidery Outsources</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[#C62828]">
                    -{formatCurrency(summary.totalCOGS)}
                  </td>
                </tr>
                <tr className="hover:bg-[#F8F9FA]">
                  <td className="py-2 pl-4 text-gray-700">Operating Overhead Expenses (Packaging, Marketing, Fuel, etc.)</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-[#C62828]">
                    -{formatCurrency(summary.totalExpenses)}
                  </td>
                </tr>
                <tr className="border-t border-[#E5E5E5] bg-[#F8F9FA]">
                  <td className="py-2.5 font-bold uppercase tracking-wider text-gray-800">Total Operating Cash Outflows</td>
                  <td className="py-2.5 text-right font-black tabular-nums text-[#C62828] text-sm">
                    -{formatCurrency(outflows)}
                  </td>
                </tr>

                {/* NET CASH FLOW */}
                <tr className={`border-y-4 ${netCashFlow < 0 ? 'border-[#C62828] bg-red-50/40' : 'border-[#111111] bg-green-50/30'}`}>
                  <td className="py-4 font-black uppercase tracking-wider text-[#111111] text-base">
                    NET CASH FLOW FROM OPERATIONS
                  </td>
                  <td className="py-4 text-right font-black tabular-nums text-lg">
                    <span className={netCashFlow < 0 ? 'text-[#C62828]' : 'text-green-800'}>
                      {formatCurrency(netCashFlow)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
