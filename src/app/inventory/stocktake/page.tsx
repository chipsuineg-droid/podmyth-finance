'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  ArrowLeft, ClipboardList, CheckCircle, AlertTriangle,
  RefreshCw, TrendingDown, TrendingUp, Save
} from 'lucide-react'

interface StockTakeLine {
  id: string
  variantId: string
  systemCount: number
  physicalCount: number
  variance: number
  varianceValue: number
  variant: {
    sku: string
    color: string
    size: string
    defaultBuyPrice: number
    product: {
      name: string
    }
  }
}

interface StockTakeData {
  id: string
  status: string
  createdAt: string
  reconciledAt?: string | null
  notes?: string | null
  lines: StockTakeLine[]
}

export default function StockTakePage() {
  const [stockTakes, setStockTakes] = useState<StockTakeData[]>([])
  const [currentTake, setCurrentTake] = useState<StockTakeData | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadStockTakes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/stocktake')
      const json = await res.json()
      const data = (json.data ?? []).map((st: any) => ({
        ...st,
        lines: (st.lines ?? []).map((l: any) => ({
          ...l,
          varianceValue: Number(l.varianceValue),
          variant: {
            ...l.variant,
            defaultBuyPrice: Number(l.variant.defaultBuyPrice),
          },
        })),
      }))
      setStockTakes(data)

      const active = data.find((st: any) => st.status === 'OPEN') || data[0]
      if (active) {
        setCurrentTake(active)
        const initialCounts: Record<string, number> = {}
        active.lines.forEach((l: any) => {
          initialCounts[l.id] = l.physicalCount
        })
        setCounts(initialCounts)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStockTakes()
  }, [])

  const startNewStockTake = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory/stocktake', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast('Failed to initiate stock take', 'error')
        return
      }
      toast('New stock-take snapshot created from live warehouse system counts!', 'success')
      loadStockTakes()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCountChange = (lineId: string, val: number) => {
    setCounts(prev => ({ ...prev, [lineId]: isNaN(val) ? 0 : Math.max(0, val) }))
  }

  const handleReconcile = async () => {
    if (!currentTake) return
    if (!confirm('Commit reconciliation? Live stock counts will be updated, and shrinkage/surplus will be written to the P&L ledger.')) return

    setSubmitting(true)
    try {
      const linesPayload = Object.entries(counts).map(([lineId, physicalCount]) => ({
        lineId,
        physicalCount,
      }))

      const res = await fetch(`/api/inventory/stocktake/${currentTake.id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: linesPayload,
          notes,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Reconciliation failed', 'error')
        return
      }

      toast('Physical stock take reconciled! Inventory counts and financial adjustments posted.', 'success')
      loadStockTakes()
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate live preview metrics based on modified inputs
  const linesWithLiveVariance = (currentTake?.lines ?? []).map(l => {
    const physical = counts[l.id] ?? l.systemCount
    const variance = physical - l.systemCount
    const varianceValue = variance * l.variant.defaultBuyPrice
    return {
      ...l,
      livePhysical: physical,
      liveVariance: variance,
      liveVarianceValue: varianceValue,
    }
  })

  const totalVarianceUnits = linesWithLiveVariance.reduce((s, l) => s + l.liveVariance, 0)
  const totalShrinkageValue = linesWithLiveVariance
    .filter(l => l.liveVariance < 0)
    .reduce((s, l) => s + Math.abs(l.liveVarianceValue), 0)
  const totalSurplusValue = linesWithLiveVariance
    .filter(l => l.liveVariance > 0)
    .reduce((s, l) => s + l.liveVarianceValue, 0)
  const netFinancialImpact = totalSurplusValue - totalShrinkageValue

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="p-2 border border-[#E5E5E5] hover:bg-[#F8F9FA]">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              Physical Stock-Take Reconciliation
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Compare warehouse physical counts against system counts, calculate variances, and post shrinkage adjustments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startNewStockTake}
            disabled={submitting}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            Snapshot New Stock Take
          </button>
        </div>
      </div>

      {currentTake ? (
        <>
          {/* Status & KPI Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card border-l-4 border-l-[#111111]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Stock Take Status</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2 py-0.5 uppercase border ${
                  currentTake.status === 'RECONCILED'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {currentTake.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Snapshot #{currentTake.id.slice(-6)}</p>
            </div>

            <div className="stat-card border-l-4 border-l-[#111111]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Net Variance Qty</p>
              <p className={`text-2xl font-black tabular-nums ${totalVarianceUnits < 0 ? 'text-[#C62828]' : totalVarianceUnits > 0 ? 'text-green-700' : 'text-[#111111]'}`}>
                {totalVarianceUnits > 0 ? `+${totalVarianceUnits}` : totalVarianceUnits} units
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Difference across all SKUs</p>
            </div>

            <div className="stat-card border-l-4 border-l-[#C62828]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Shrinkage Loss</p>
              <p className="text-2xl font-black text-[#C62828] tabular-nums">
                -{formatCurrency(totalShrinkageValue)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Inventory missing at buying cost</p>
            </div>

            <div className={`stat-card border-l-4 ${netFinancialImpact >= 0 ? 'border-l-green-600' : 'border-l-[#C62828]'}`}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Net Financial Adjustment</p>
              <p className={`text-2xl font-black tabular-nums ${netFinancialImpact < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
                {formatCurrency(netFinancialImpact)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Posted to P&L ledger</p>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="card p-0">
            <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Variant Reconciliation Grid
                </h2>
                <p className="text-[11px] text-gray-500">Enter actual counted stock in the "Physical Count" column</p>
              </div>
              {currentTake.status === 'OPEN' && (
                <div className="flex items-center gap-2">
                  <input
                    className="input text-xs w-64"
                    placeholder="Audit notes e.g. End of month audit..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <button
                    onClick={handleReconcile}
                    disabled={submitting}
                    className="btn-primary text-xs font-bold flex items-center gap-1.5 py-1.5 px-4"
                  >
                    <Save size={13} />
                    {submitting ? 'Reconciling...' : 'Reconcile & Adjust'}
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left">SKU</th>
                    <th className="table-header text-left">Product Name & Variant</th>
                    <th className="table-header text-right">Unit Buy Price</th>
                    <th className="table-header text-center w-28">System Count</th>
                    <th className="table-header text-center w-32">Physical Count</th>
                    <th className="table-header text-center w-28">Variance Qty</th>
                    <th className="table-header text-right w-36">Variance Financial Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {linesWithLiveVariance.map(line => {
                    const isShrinkage = line.liveVariance < 0
                    const isSurplus = line.liveVariance > 0
                    const isZero = line.liveVariance === 0

                    return (
                      <tr key={line.id} className="hover:bg-[#F8F9FA]">
                        <td className="table-cell font-mono text-xs text-gray-500 font-semibold">{line.variant.sku}</td>
                        <td className="table-cell text-xs font-semibold text-[#111111]">
                          {line.variant.product.name}
                          <span className="text-gray-500 font-normal"> - {line.variant.color} / {line.variant.size}</span>
                        </td>
                        <td className="table-cell text-right tabular-nums text-xs text-gray-600 font-medium">
                          {formatCurrency(line.variant.defaultBuyPrice)}
                        </td>
                        <td className="table-cell text-center tabular-nums text-xs font-bold text-gray-700">
                          {line.systemCount}
                        </td>
                        <td className="table-cell text-center">
                          {currentTake.status === 'OPEN' ? (
                            <input
                              type="number"
                              min="0"
                              className={`input text-xs text-center font-bold tabular-nums w-20 py-1 ${
                                isShrinkage ? 'border-[#C62828] text-[#C62828] bg-red-50/30' :
                                isSurplus ? 'border-green-600 text-green-700 bg-green-50/30' : ''
                              }`}
                              value={line.livePhysical}
                              onChange={e => handleCountChange(line.id, parseInt(e.target.value))}
                            />
                          ) : (
                            <span className="font-bold tabular-nums text-xs">{line.physicalCount}</span>
                          )}
                        </td>
                        <td className={`table-cell text-center tabular-nums text-xs font-black ${
                          isShrinkage ? 'text-[#C62828]' : isSurplus ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          {isSurplus ? `+${line.liveVariance}` : line.liveVariance}
                        </td>
                        <td className={`table-cell text-right tabular-nums text-xs font-black ${
                          isShrinkage ? 'text-[#C62828]' : isSurplus ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          {isShrinkage ? `-${formatCurrency(Math.abs(line.liveVarianceValue))}` :
                           isSurplus ? `+${formatCurrency(line.liveVarianceValue)}` : '$0.00'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 space-y-4">
          <ClipboardList size={36} className="text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">No stock take snapshot available.</p>
          <button
            onClick={startNewStockTake}
            className="btn-primary text-xs"
          >
            Snapshot New Stock Take
          </button>
        </div>
      )}
    </div>
  )
}
