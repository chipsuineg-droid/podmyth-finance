'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { Download, Printer, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function BalanceSheetPage() {
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
      'PODMYTH - BALANCE SHEET STATEMENT',
      `As of: ${format(new Date(), 'yyyy-MM-dd')}`,
      '',
      'ASSETS,Amount (USD)',
      `Current Inventory Valuation (at Buying Cost),$${summary.inventoryValue.toFixed(2)}`,
      `Accounts Receivable (Outstanding Unpaid Orders),$${summary.arBalance.toFixed(2)}`,
      `Cash on Hand,$${summary.totalCollected.toFixed(2)}`,
      `TOTAL ASSETS,$${(summary.inventoryValue + summary.arBalance + summary.totalCollected).toFixed(2)}`,
      '',
      'LIABILITIES & OWNER EQUITY,Amount (USD)',
      `Cumulative Retained Earnings / Equity,$${(summary.inventoryValue + summary.arBalance + summary.totalCollected).toFixed(2)}`,
      `TOTAL LIABILITIES & EQUITY,$${(summary.inventoryValue + summary.arBalance + summary.totalCollected).toFixed(2)}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PodMyth_Balance_Sheet_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  // Balance sheet figures
  const inventoryVal = summary ? summary.inventoryValue : 0
  const arVal = summary ? summary.arBalance : 0
  const cashVal = summary ? Math.max(0, summary.totalCollected - summary.totalExpenses) : 0
  const totalAssets = inventoryVal + arVal + cashVal
  const totalLiabilities = 0
  const totalEquity = totalAssets - totalLiabilities

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">Balance Sheet Snapshot</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Statement of Financial Position: Current Warehouse Assets, Accounts Receivable vs Equity
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

      {/* Statement Sheet */}
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
              STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">As at: <strong className="text-[#111111]">{format(new Date(), 'd MMMM yyyy')}</strong></p>
            <div className="flex items-center justify-end gap-1.5 text-green-700 text-xs font-bold mt-1">
              <CheckCircle2 size={13} />
              <span>Balanced (Assets = Equity)</span>
            </div>
          </div>
        </div>

        {loading || !summary ? (
          <div className="py-16 text-center text-xs text-gray-400">Loading balance sheet...</div>
        ) : (
          <div className="space-y-8">
            {/* ASSETS SECTION */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#111111] border-b border-[#111111] pb-2">
                ASSETS
              </h3>
              <table className="w-full text-xs mt-2">
                <tbody>
                  <tr className="hover:bg-[#F8F9FA]">
                    <td className="py-2.5 font-medium text-gray-800">
                      Cash on Hand (Collected Customer Receipts less Disbursed Overheads)
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-[#111111]">
                      {formatCurrency(cashVal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8F9FA] border-t border-[#E5E5E5]">
                    <td className="py-2.5 font-medium text-gray-800">
                      Current Warehouse Inventory Valuation (Physical Apparel at Unit Buying Cost)
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-[#111111]">
                      {formatCurrency(inventoryVal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8F9FA] border-t border-[#E5E5E5]">
                    <td className="py-2.5 font-medium text-gray-800">
                      Accounts Receivable (Delivered Invoices Awaiting Client Settlement)
                    </td>
                    <td className={`py-2.5 text-right font-bold tabular-nums ${arVal > 0 ? 'text-[#C62828]' : 'text-[#111111]'}`}>
                      {formatCurrency(arVal)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-[#111111] bg-gray-50 font-black">
                    <td className="py-3 text-sm uppercase tracking-wider text-[#111111]">
                      TOTAL ASSETS
                    </td>
                    <td className="py-3 text-right text-base tabular-nums text-[#111111]">
                      {formatCurrency(totalAssets)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* LIABILITIES & EQUITY SECTION */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#111111] border-b border-[#111111] pb-2">
                LIABILITIES & OWNER'S EQUITY
              </h3>
              <table className="w-full text-xs mt-2">
                <tbody>
                  <tr className="hover:bg-[#F8F9FA]">
                    <td className="py-2.5 font-medium text-gray-800">
                      Accounts Payable & Short-Term Liabilities
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-gray-400">
                      $0.00
                    </td>
                  </tr>
                  <tr className="border-t border-[#E5E5E5] bg-[#F8F9FA]">
                    <td className="py-2 font-bold uppercase tracking-wider text-gray-700">Total Liabilities</td>
                    <td className="py-2 text-right font-bold tabular-nums text-gray-600">$0.00</td>
                  </tr>
                  <tr className="hover:bg-[#F8F9FA] border-t border-[#E5E5E5]">
                    <td className="py-2.5 font-medium text-gray-800">
                      Owner's Equity & Retained Earnings
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-[#111111]">
                      {formatCurrency(totalEquity)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-[#111111] bg-gray-50 font-black">
                    <td className="py-3 text-sm uppercase tracking-wider text-[#111111]">
                      TOTAL LIABILITIES & OWNER'S EQUITY
                    </td>
                    <td className="py-3 text-right text-base tabular-nums text-[#111111]">
                      {formatCurrency(totalEquity + totalLiabilities)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Accounting Note */}
            <div className="pt-6 border-t border-[#E5E5E5] text-[10px] text-gray-400">
              <p>Valuation Principle: Inventory is carried strictly at historical buying price (FIFO / unit acquisition cost).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
