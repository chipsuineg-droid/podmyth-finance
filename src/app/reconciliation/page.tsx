'use client'
import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  FileCheck2, CheckCircle2, Circle, Clock, Printer,
  Download, ArrowRight, ShieldCheck, DollarSign, Package,
  AlertCircle, ArrowUpRight, ArrowDownLeft, Calendar, FileSpreadsheet,
  Check, RefreshCw
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

interface InflowItem {
  source: string
  amount: number
  method?: string
  date?: string
  ref?: string
}

interface OutflowItem {
  description: string
  category: string
  amount: number
  date?: string
}

interface PendingInvoiceItem {
  id: string
  refNumber: string
  clientName: string
  issueDate: string
  total: number
  paid: number
  pending: number
  status: string
}

interface UnbankedFundItem {
  description: string
  amount: number
  status: string
}

interface TopProductItem {
  name: string
  unitsSold: number
  revenue: number
  cogs: number
  profit: number
}

interface TradingPerformance {
  grossRevenue: number
  totalCOGS: number
  grossProfit: number
  grossMargin: number
  operatingExpenses: number
  netProfit: number
  netMargin: number
  invoicesCount: number
}

interface ReconciliationData {
  month: string
  monthLabel: string
  isOfficialOctober: boolean
  availableMonths: { value: string; label: string; isOfficial?: boolean }[]
  // 4 Pillars
  cashAvailable: number
  pendingFunds: number
  stockInventoryValue: number
  totalRecordedAssets: number
  // Cash Reconciliation
  openingCash: number
  inflowItems: InflowItem[]
  totalCashReceived: number
  outflowItems: OutflowItem[]
  totalCashOutflows: number
  netCashFlow: number
  // Receivables
  unbankedFunds: UnbankedFundItem[]
  pendingInvoices: PendingInvoiceItem[]
  // Trading P&L
  trading: TradingPerformance
  topProducts: TopProductItem[]
  actionPoints: ActionPointItem[]
}

export default function ReconciliationReportPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-10')
  const [data, setData] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async (month: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reconciliation?month=${month}`)
      const json = await res.json()
      if (json.data) {
        setData(json.data)
      }
    } catch {
      toast('Failed to load audit report', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedMonth)
  }, [selectedMonth])

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
      loadData(selectedMonth)
    } catch {
      toast('Failed to update action status', 'error')
    }
  }

  const exportCSV = () => {
    if (!data) return
    const lines: string[] = []
    lines.push(`PODMYTH MEDICAL APPAREL & DIAGNOSTIC GEAR`)
    lines.push(`MONTHLY FINANCIAL RECONCILIATION & FUND AUDIT REPORT - ${data.monthLabel.toUpperCase()}`)
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push(``)
    lines.push(`1. EXECUTIVE FUND STANDPOINT`)
    lines.push(`Metric,Amount (USD)`)
    lines.push(`Closing Physical Cash Available,${data.cashAvailable.toFixed(2)}`)
    lines.push(`Total Outstanding Pending Funds (AR + Cash-in),${data.pendingFunds.toFixed(2)}`)
    lines.push(`Total Available Stock Inventory Valuation,${data.stockInventoryValue.toFixed(2)}`)
    lines.push(`TOTAL CONSOLIDATED RECORDED ASSETS,${data.totalRecordedAssets.toFixed(2)}`)
    lines.push(``)
    lines.push(`2. CASH INFLOWS (RECEIPTS)`)
    lines.push(`Source,Amount (USD),Payment Method,Date`)
    data.inflowItems.forEach(i => {
      lines.push(`"${i.source}",${i.amount.toFixed(2)},"${i.method || 'CASH'}","${i.date || ''}"`)
    })
    lines.push(`Total Cash Received,${data.totalCashReceived.toFixed(2)}`)
    lines.push(``)
    lines.push(`3. CASH OUTFLOWS (DISBURSEMENTS)`)
    lines.push(`Description,Category,Amount (USD),Date`)
    data.outflowItems.forEach(o => {
      lines.push(`"${o.description}","${o.category}",${o.amount.toFixed(2)},"${o.date || ''}"`)
    })
    lines.push(`Total Cash Outflows,${data.totalCashOutflows.toFixed(2)}`)
    lines.push(``)
    lines.push(`4. OUTSTANDING PENDING RECEIVABLES`)
    lines.push(`Client Name,Invoice #,Issue Date,Total Billed,Amount Paid,Pending Balance,Status`)
    data.pendingInvoices.forEach(inv => {
      lines.push(`"${inv.clientName}","${inv.refNumber}","${inv.issueDate}",${inv.total.toFixed(2)},${inv.paid.toFixed(2)},${inv.pending.toFixed(2)},"${inv.status}"`)
    })
    data.unbankedFunds.forEach(u => {
      lines.push(`"${u.description}","N/A","N/A",${u.amount.toFixed(2)},0.00,${u.amount.toFixed(2)},"${u.status}"`)
    })
    lines.push(``)
    lines.push(`5. MONTHLY TRADING P&L STANDPOINT`)
    lines.push(`Gross Billed Revenue,${data.trading.grossRevenue.toFixed(2)}`)
    lines.push(`Direct Cost of Goods Sold (COGS),${data.trading.totalCOGS.toFixed(2)}`)
    lines.push(`Gross Trading Profit,${data.trading.grossProfit.toFixed(2)}`)
    lines.push(`Gross Trading Margin %,${data.trading.grossMargin.toFixed(1)}%`)
    lines.push(`Operational Overhead Expenses,${data.trading.operatingExpenses.toFixed(2)}`)
    lines.push(`Net Operating Profit,${data.trading.netProfit.toFixed(2)}`)
    lines.push(`Net Margin %,${data.trading.netMargin.toFixed(1)}%`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PodMyth-Financial-Audit-${data.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('Audit CSV downloaded successfully')
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Action & Filter Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight uppercase">
              Financial Reconciliation & Audit Engine
            </h1>
            {data?.isOfficialOctober && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#C62828] text-white px-2 py-0.5">
                OFFICIAL OCTOBER AUDIT
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Dynamic Monthly Fund Standpoint, Cash Inflows/Outflows, Verified Assets, and P&L Reconciliation
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E5E5E5] px-3 py-1.5 rounded">
            <Calendar size={14} className="text-gray-500" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Audit Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#111111] border-none focus:outline-none cursor-pointer"
            >
              {data?.availableMonths?.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label} {m.isOfficial ? '★ (Official Report)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportCSV}
            disabled={!data || loading}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Download CSV for Excel or Google Sheets"
          >
            <FileSpreadsheet size={13} className="text-green-700" /> Export CSV
          </button>

          <button
            onClick={() => window.print()}
            disabled={!data || loading}
            className="btn-primary text-xs flex items-center gap-1.5 bg-[#111111] hover:bg-black text-white"
          >
            <Printer size={13} /> Print / Save PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          Loading {selectedMonth} reconciliation audit statement...
        </div>
      )}

      {data && !loading && (
        <>
          {/* Top 4 KPI Pillar Cards (Internal View & Screen View) */}
          <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E5E5E5] p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                Closing Cash Available
              </span>
              <p className="text-2xl font-black text-[#111111] tabular-nums">
                {formatCurrency(data.cashAvailable)}
              </p>
              <span className="text-[10px] font-bold text-gray-500 mt-1 block">
                Physical funds at month close
              </span>
            </div>

            <div className="bg-white border border-[#E5E5E5] p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                Total Pending Funds
              </span>
              <p className="text-2xl font-black text-[#C62828] tabular-nums">
                {formatCurrency(data.pendingFunds)}
              </p>
              <span className="text-[10px] font-bold text-gray-500 mt-1 block">
                {data.pendingInvoices.length} invoices + unbanked cash
              </span>
            </div>

            <div className="bg-white border border-[#E5E5E5] p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                Stock Inventory Value
              </span>
              <p className="text-2xl font-black text-[#111111] tabular-nums">
                {formatCurrency(data.stockInventoryValue)}
              </p>
              <span className="text-[10px] font-bold text-gray-500 mt-1 block">
                Physical shop stock at unit cost
              </span>
            </div>

            <div className="bg-[#111111] text-white p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-300 block mb-1">
                Total Recorded Assets
              </span>
              <p className="text-2xl font-black text-white tabular-nums">
                {formatCurrency(data.totalRecordedAssets)}
              </p>
              <span className="text-[10px] font-bold text-red-400 mt-1 block">
                Cash + Pending Funds + Stock
              </span>
            </div>
          </div>

          {/* MAIN PRINTABLE A4 AUDIT STATEMENT */}
          <div className="bg-white border border-[#E5E5E5] p-8 lg:p-12 shadow-sm print:border-0 print:p-0 space-y-8">
            {/* Document Title Header */}
            <div className="text-center pb-6 border-b-2 border-[#111111]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black text-[#C62828] tracking-widest uppercase">
                  PODMERCH
                </span>
                <span className="text-xs font-black bg-[#111111] text-white px-2 py-0.5 uppercase tracking-widest">
                  AUDIT
                </span>
              </div>
              <h2 className="text-xl font-black text-[#111111] mt-2 tracking-tight uppercase">
                End of {data.monthLabel} Financial Reconciliation Report
              </h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                PodMyth Medical Apparel & Diagnostic Gear Operations • Standpoint of Funds Statement
              </p>
            </div>

            {/* SECTION 1: STOCK INVENTORY */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  1. Stock Inventory Valuation
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  At Retail Selling Price
                </span>
              </div>
              <table className="w-full text-xs border border-[#E5E5E5]">
                <thead>
                  <tr className="bg-[#111111] text-white">
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Description</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-44">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-3 px-4 font-bold text-[#111111]">
                      Total Available Stock (Physical Retail Shop Inventory)
                    </td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#111111]">
                      {formatCurrency(data.stockInventoryValue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 2: CASH INFLOWS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  2. Cash Inflows (Receipts)
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {data.inflowItems.length} Transactions
                </span>
              </div>
              <table className="w-full text-xs border border-[#E5E5E5]">
                <thead>
                  <tr className="bg-[#111111] text-white">
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Source / Client</th>
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider hidden sm:table-cell">Method / Ref</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-44">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {data.inflowItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-4 font-semibold text-[#111111]">{item.source}</td>
                      <td className="py-2.5 px-4 text-gray-500 text-[11px] font-medium hidden sm:table-cell">
                        {item.method || 'USD_CASH'} {item.date ? `• ${item.date}` : ''}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-[#111111]">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/70 border-t-2 border-[#111111]">
                    <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">Total Cash Received</td>
                    <td className="py-3 px-4 hidden sm:table-cell"></td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#C62828]">
                      {formatCurrency(data.totalCashReceived)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 3: CASH OUTFLOWS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  3. Cash Outflows (Operational Disbursements)
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {data.outflowItems.length} Expenses
                </span>
              </div>
              <table className="w-full text-xs border border-[#E5E5E5]">
                <thead>
                  <tr className="bg-[#111111] text-white">
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Description</th>
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-44">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {data.outflowItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-4 font-semibold text-[#111111]">{item.description}</td>
                      <td className="py-2.5 px-4 text-gray-500 text-[11px] font-medium uppercase hidden sm:table-cell">
                        {item.category}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-[#111111]">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-red-50/70 border-t-2 border-[#111111]">
                    <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">Total Cash Outflows</td>
                    <td className="py-3 px-4 hidden sm:table-cell"></td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#C62828]">
                      {formatCurrency(data.totalCashOutflows)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 4: ACTUAL CASH POSITION */}
            <div className="border border-[#111111] bg-[#F8F9FA] p-5">
              <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider mb-2">
                4. Actual Cash Position
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-base font-black text-[#111111] uppercase tracking-wide">
                    Closing Cash Balance: <span className="bg-[#111111] text-white px-2.5 py-1 text-lg font-black ml-1">{formatCurrency(data.cashAvailable)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Calculated as Total Received ({formatCurrency(data.totalCashReceived)}) minus Total Outflows ({formatCurrency(data.totalCashOutflows)}).
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Net Period Movement</span>
                  <span className={`text-lg font-black tabular-nums ${data.netCashFlow >= 0 ? 'text-[#111111]' : 'text-[#C62828]'}`}>
                    {data.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.netCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 5: OUTSTANDING PAYMENTS & FUNDS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  5. Outstanding Payments and Funds
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Not yet part of physical cash balance
                </span>
              </div>
              <table className="w-full text-xs border border-[#E5E5E5]">
                <thead>
                  <tr className="bg-[#111111] text-white">
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Description / Client</th>
                    <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider hidden sm:table-cell">Reference / Date</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider w-36">Amount</th>
                    <th className="py-2.5 px-4 text-center font-bold uppercase tracking-wider w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {/* Unbanked mobile money / internal cash held */}
                  {data.unbankedFunds.map((u, idx) => (
                    <tr key={`u-${idx}`} className="bg-amber-50/40">
                      <td className="py-2.5 px-4 font-bold text-[#111111]">{u.description}</td>
                      <td className="py-2.5 px-4 text-gray-500 text-[11px] hidden sm:table-cell">Internal Reserve</td>
                      <td className="py-2.5 px-4 text-right font-black tabular-nums text-[#111111]">
                        {formatCurrency(u.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Client Unpaid Invoices */}
                  {data.pendingInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-4 font-bold text-[#111111]">
                        {inv.clientName} – Outstanding Payment
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 text-[11px] hidden sm:table-cell">
                        {inv.refNumber} • {inv.issueDate}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black tabular-nums text-[#C62828]">
                        {formatCurrency(inv.pending)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#C62828] bg-red-100 px-2 py-0.5">
                          PENDING
                        </span>
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-red-50/70 border-t-2 border-[#111111]">
                    <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">Total Pending Funds</td>
                    <td className="py-3 px-4 hidden sm:table-cell"></td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-sm text-[#C62828]">
                      {formatCurrency(data.pendingFunds)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] font-black text-gray-400 uppercase">
                      RECEIVABLES
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 6: CONSOLIDATED FINANCIAL POSITION */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  6. Consolidated Financial Position
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {data.monthLabel} Closing Position Summary
                </span>
              </div>
              <table className="w-full text-xs border border-[#E5E5E5]">
                <tbody className="divide-y divide-[#E5E5E5]">
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-800">Cash available</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#111111] w-44">
                      {formatCurrency(data.cashAvailable)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-800">Pending funds</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#C62828] w-44">
                      {formatCurrency(data.pendingFunds)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-800">Stock available</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#111111] w-44">
                      {formatCurrency(data.stockInventoryValue)}
                    </td>
                  </tr>
                  <tr className="bg-[#111111] text-white">
                    <td className="py-3 px-4 font-black uppercase tracking-wider">Total Recorded Assets</td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-base text-white w-44">
                      {formatCurrency(data.totalRecordedAssets)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 7: MONTHLY TRADING P&L STANDPOINT */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  7. Monthly Trading Performance & Profitability
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {data.trading.invoicesCount} Invoices Issued
                </span>
              </div>
              <table className="w-full text-xs border border-[#E5E5E5]">
                <tbody className="divide-y divide-[#E5E5E5]">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Gross Sales Billed Revenue</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#111111] w-44">
                      {formatCurrency(data.trading.grossRevenue)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Less: Direct Cost of Goods Sold (Unit Buying Costs)</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#C62828] w-44">
                      -{formatCurrency(data.trading.totalCOGS)}
                    </td>
                  </tr>
                  <tr className="bg-[#F8F9FA]">
                    <td className="py-2.5 px-4 font-black uppercase tracking-wider text-[#111111]">
                      Gross Trading Profit ({formatPercent(data.trading.grossMargin)} Margin)
                    </td>
                    <td className="py-2.5 px-4 text-right font-black tabular-nums text-sm text-[#111111] w-44">
                      {formatCurrency(data.trading.grossProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-gray-800">Less: Operating Overhead Expenses</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#C62828] w-44">
                      -{formatCurrency(data.trading.operatingExpenses)}
                    </td>
                  </tr>
                  <tr className="bg-red-50/70 border-t-2 border-[#111111]">
                    <td className="py-3 px-4 font-black uppercase tracking-wider text-[#C62828]">
                      Net Operating Profit ({formatPercent(data.trading.netMargin)} Net Margin)
                    </td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-base text-[#C62828] w-44">
                      {formatCurrency(data.trading.netProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 8: TOP MOVING PRODUCTS */}
            {data.topProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                    8. Product Volume & Revenue Movement
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Top Moving SKUs
                  </span>
                </div>
                <table className="w-full text-xs border border-[#E5E5E5]">
                  <thead>
                    <tr className="bg-[#111111] text-white">
                      <th className="py-2 px-3 text-left font-bold uppercase tracking-wider">Product Description</th>
                      <th className="py-2 px-3 text-center font-bold uppercase tracking-wider w-20">Units</th>
                      <th className="py-2 px-3 text-right font-bold uppercase tracking-wider w-28">Revenue</th>
                      <th className="py-2 px-3 text-right font-bold uppercase tracking-wider w-28">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {data.topProducts.slice(0, 6).map((tp, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F9FA]">
                        <td className="py-2 px-3 font-semibold text-[#111111]">{tp.name}</td>
                        <td className="py-2 px-3 text-center font-bold tabular-nums">{tp.unitsSold}</td>
                        <td className="py-2 px-3 text-right font-semibold tabular-nums">{formatCurrency(tp.revenue)}</td>
                        <td className="py-2 px-3 text-right font-black tabular-nums text-[#C62828]">
                          {formatCurrency(tp.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION 9: OUTSTANDING ACTION POINTS & RECOVERY CHECKLIST */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-[#C62828] uppercase tracking-wider">
                  9. Outstanding Action Points & Fund Recovery Checklist
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Click to mark resolved
                </span>
              </div>
              <div className="border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
                {data.actionPoints.map((ap) => {
                  const isDone = ap.status === 'COMPLETED'
                  return (
                    <div
                      key={ap.id}
                      onClick={() => toggleAction(ap.id, ap.status)}
                      className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                        isDone ? 'bg-gray-50 opacity-60' : 'hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isDone ? 'bg-[#111111] border-[#111111] text-white' : 'border-[#111111] bg-white'
                          }`}
                        >
                          {isDone && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isDone ? 'line-through text-gray-400' : 'text-[#111111]'}`}>
                            ● {ap.title}
                          </p>
                          {ap.notes && (
                            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{ap.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {ap.amount > 0 && (
                          <span className={`text-xs font-black tabular-nums block ${isDone ? 'text-gray-400' : 'text-[#C62828]'}`}>
                            {formatCurrency(Number(ap.amount))}
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isDone ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {ap.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SECTION 10: OFFICIAL AUTHENTICATION & SIGN-OFF BLOCK */}
            <div className="pt-8 border-t-2 border-[#111111] grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-6">
                  Prepared & Verified By:
                </p>
                <div className="border-b border-[#111111] w-48 mb-1"></div>
                <p className="font-bold text-[#111111]">Shawn / Genius Chipfupa</p>
                <p className="text-[10px] text-gray-500 uppercase">PodMyth Financial Operations</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-6">
                  Approved & Ratified By:
                </p>
                <div className="border-b border-[#111111] w-48 ml-auto mb-1"></div>
                <p className="font-bold text-[#111111]">Managing Executive Committee</p>
                <p className="text-[10px] text-gray-500 uppercase">PodMyth Medical Apparel & Diagnostic Gear</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
