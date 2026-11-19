'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  FileCheck2, CheckCircle2, Circle, Clock, Printer,
  Download, ArrowRight, ShieldCheck, DollarSign, Package,
  AlertCircle, ArrowUpRight, ArrowDownLeft
} from 'lucide-react'

interface ActionPointItem {
  id: string
  title: string
  amount: number
  category: string
  person?: string | null
  status: string
  notes?: string | null
}

interface ReconciliationData {
  stockInventoryValue: number
  initialCashInHand: number
  geniusPayments: number
  penTorchSale: number
  totalCashReceived: number
  wcnRepayment: number
  shawnFuel: number
  merchantLinePayment: number
  domainPayment: number
  totalCashOutflows: number
  actualCashPosition: number
  totalPendingFunds: number
  totalRecordedAssets: number
  actionPoints: ActionPointItem[]
  pendingInvoices: any[]
}

export default function ReconciliationReportPage() {
  const [data, setData] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const res = await fetch('/api/reconciliation')
      const json = await res.json()
      setData(json.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleAction = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    try {
      const res = await fetch('/api/reconciliation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      })
      if (!res.ok) throw new Error()
      toast(`Action marked as ${nextStatus.toLowerCase()}`)
      setData(prev => {
        if (!prev) return null
        return {
          ...prev,
          actionPoints: prev.actionPoints.map(ap => ap.id === id ? { ...ap, status: nextStatus } : ap)
        }
      })
    } catch {
      toast('Failed to update action status', 'error')
    }
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-gray-400">Loading reconciliation report...</div>
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              End of October 2026 Financial Reconciliation Report
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#C62828] text-white px-2 py-0.5">
              OFFICIAL PODMERCH REPORT
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Exact authenticated financial audit matching the signed monthly reconciliation statement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Printer size={13} /> Print Official A4
          </button>
        </div>
      </div>

      {/* Main Document Body (Printable A4) */}
      <div className="bg-white border border-[#E5E5E5] p-8 lg:p-12 shadow-sm print:border-0 print:p-0 space-y-8">
        {/* Document Title Header */}
        <div className="text-center pb-6 border-b-2 border-[#111111]">
          <h2 className="text-3xl font-black text-[#C62828] tracking-widest uppercase">
            PODMERCH
          </h2>
          <p className="text-base font-black text-[#111111] mt-1 tracking-tight">
            End of October 2026 Financial Reconciliation Report
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            PodMyth Medical Apparel & Diagnostic Gear Operations
          </p>
        </div>

        {/* 1. STOCK INVENTORY */}
        <div>
          <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider mb-3">
            1. Stock Inventory
          </h3>
          <table className="w-full text-xs border border-[#E5E5E5]">
            <thead>
              <tr className="bg-[#111111] text-white">
                <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Description</th>
                <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-40">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#111111]">Total Available Stock</td>
                <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#111111]">
                  {formatCurrency(data.stockInventoryValue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. CASH INFLOWS */}
        <div>
          <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider mb-3">
            2. Cash Inflows
          </h3>
          <table className="w-full text-xs border border-[#E5E5E5]">
            <thead>
              <tr className="bg-[#111111] text-white">
                <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Source</th>
                <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-40">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Initial cash in hand</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatCurrency(data.initialCashInHand)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Genius – Payment 1</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$23.00</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Genius – Payment 2</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$13.00</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Genius – Payment 3</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$20.00</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Genius – Payment 4</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$11.00</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Pen torch sale</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$5.00</td>
              </tr>
              <tr className="bg-red-50/60 font-bold border-t-2 border-[#111111]">
                <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">Total Cash Received</td>
                <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#C62828]">
                  {formatCurrency(data.totalCashReceived)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. CASH OUTFLOWS */}
        <div>
          <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider mb-3">
            3. Cash Outflows
          </h3>
          <table className="w-full text-xs border border-[#E5E5E5]">
            <thead>
              <tr className="bg-[#111111] text-white">
                <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Description</th>
                <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-40">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">WCN repayment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatCurrency(data.wcnRepayment)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Shawn – Fuel</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatCurrency(data.shawnFuel)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Merchant line payment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatCurrency(data.merchantLinePayment)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Domain payment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatCurrency(data.domainPayment)}</td>
              </tr>
              <tr className="bg-red-50/60 font-bold border-t-2 border-[#111111]">
                <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">Total Cash Outflows</td>
                <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#C62828]">
                  {formatCurrency(data.totalCashOutflows)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. ACTUAL CASH POSITION */}
        <div>
          <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider mb-3">
            4. Actual Cash Position
          </h3>
          <div className="border border-[#111111] p-4 bg-gray-50 flex items-center justify-between">
            <div>
              <span className="font-black text-sm uppercase tracking-wider text-[#111111]">
                CASH BALANCE:
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Total received (${data.totalCashReceived.toFixed(2)}) <em>less</em> payments (${data.totalCashOutflows.toFixed(2)})
              </p>
            </div>
            <span className="text-2xl font-black text-[#111111] tabular-nums">
              {formatCurrency(data.actualCashPosition)}
            </span>
          </div>
        </div>

        {/* 5. OUTSTANDING PAYMENTS AND FUNDS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider">
              5. Outstanding Payments and Funds
            </h3>
            <span className="text-[11px] text-gray-400 italic">
              These amounts are not yet part of the physical cash balance.
            </span>
          </div>
          <table className="w-full text-xs border border-[#E5E5E5]">
            <thead>
              <tr className="bg-[#111111] text-white">
                <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Description</th>
                <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-36">Amount</th>
                <th className="py-2.5 px-4 text-center font-bold uppercase tracking-wider w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Shawn – Outstanding cash-in</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$25.00</td>
                <td className="py-2.5 px-4 text-center"><span className="badge-pending">Pending</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Genius – Outstanding cash-in</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$10.00</td>
                <td className="py-2.5 px-4 text-center"><span className="badge-pending">Pending</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Dr Karie – Outstanding payment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$135.00</td>
                <td className="py-2.5 px-4 text-center"><span className="badge-pending">Pending</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Kuziva – Outstanding payment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$45.00</td>
                <td className="py-2.5 px-4 text-center"><span className="badge-pending">Pending</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">St John – Outstanding payment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$30.00</td>
                <td className="py-2.5 px-4 text-center"><span className="badge-pending">Pending</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Tawo – Outstanding payment</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$2.00</td>
                <td className="py-2.5 px-4 text-center"><span className="badge-pending">Pending</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">EcoCash funds</td>
                <td className="py-2.5 px-4 text-right font-semibold tabular-nums">$48.00</td>
                <td className="py-2.5 px-4 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                    Awaiting withdrawal
                  </span>
                </td>
              </tr>
              <tr className="bg-red-50/60 font-bold border-t-2 border-[#111111]">
                <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">Total Pending Funds</td>
                <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#C62828]">
                  {formatCurrency(data.totalPendingFunds)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. CONSOLIDATED FINANCIAL POSITION */}
        <div>
          <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider mb-3">
            6. Consolidated Financial Position
          </h3>
          <p className="text-xs text-gray-500 mb-2 font-medium">October Closing Position Summary</p>
          <table className="w-full text-xs border border-[#E5E5E5]">
            <tbody className="divide-y divide-[#E5E5E5]">
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Cash available</td>
                <td className="py-2.5 px-4 text-right font-bold tabular-nums text-sm">{formatCurrency(data.actualCashPosition)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Pending funds</td>
                <td className="py-2.5 px-4 text-right font-bold tabular-nums text-sm">{formatCurrency(data.totalPendingFunds)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-gray-800">Stock available</td>
                <td className="py-2.5 px-4 text-right font-bold tabular-nums text-sm">{formatCurrency(data.stockInventoryValue)}</td>
              </tr>
              <tr className="bg-[#111111] text-white">
                <td className="py-3.5 px-4 font-black uppercase tracking-wider text-sm">Total recorded assets</td>
                <td className="py-3.5 px-4 text-right font-black tabular-nums text-base">
                  {formatCurrency(data.totalRecordedAssets)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 7. OUTSTANDING ACTION POINTS */}
        <div>
          <h3 className="text-sm font-black text-[#C62828] uppercase tracking-wider mb-3">
            7. Outstanding Action Points
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Live checklist to track fund collection, withdrawals, and stock synchronization. Click items to toggle status.
          </p>

          <div className="space-y-2">
            {data.actionPoints.map((ap) => {
              const isDone = ap.status === 'COMPLETED'
              return (
                <div
                  key={ap.id}
                  onClick={() => toggleAction(ap.id, ap.status)}
                  className={`p-3 border flex items-center justify-between cursor-pointer transition-colors ${
                    isDone ? 'bg-green-50/50 border-green-200' : 'bg-[#F8F9FA] border-[#E5E5E5] hover:border-[#111111]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-gray-400 shrink-0" />
                    )}
                    <span className={`text-xs font-semibold ${isDone ? 'line-through text-gray-400' : 'text-[#111111]'}`}>
                      {ap.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {Number(ap.amount) > 0 && (
                      <span className={`text-xs font-black tabular-nums ${isDone ? 'text-gray-400' : 'text-[#C62828]'}`}>
                        {formatCurrency(Number(ap.amount))}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border ${
                      isDone ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {ap.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sign-off footer */}
        <div className="pt-8 border-t border-[#E5E5E5] flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
          <span>PodMerch Internal Accounting • End of Month Close</span>
          <span>Verified & Reconciled</span>
        </div>
      </div>
    </div>
  )
}
