'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { ArrowLeft, RefreshCw, Filter, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'

interface MovementItem {
  id: string
  type: string
  qty: number
  buyingPrice: number
  sellingPrice: number
  supplier?: string | null
  notes?: string | null
  createdAt: string
  referenceId?: string | null
  variant: {
    sku: string
    color: string
    size: string
    product: {
      name: string
    }
  }
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<MovementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')

  const loadMovements = useCallback(async () => {
    setLoading(true)
    try {
      const url = typeFilter === 'ALL' ? '/api/inventory/movements' : `/api/inventory/movements?type=${typeFilter}`
      const res = await fetch(url)
      const json = await res.json()
      setMovements((json.data ?? []).map((m: any) => ({
        ...m,
        buyingPrice: Number(m.buyingPrice),
        sellingPrice: Number(m.sellingPrice),
      })))
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => {
    loadMovements()
  }, [loadMovements])

  const totalInbound = movements.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0)
  const totalOutbound = movements.filter(m => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="p-2 border border-[#E5E5E5] hover:bg-[#F8F9FA]">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">Stock Movement Audit Log</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Immutable ledger of all inbound shipments, sales deductions, returns, and physical stock-take adjustments
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Movement Type:</label>
          <select
            className="select text-xs w-44"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="INBOUND">Inbound Restock</option>
            <option value="SALE">Invoice Sale</option>
            <option value="RETURN">Return / Restock</option>
            <option value="SHRINKAGE">Stock-Take Shrinkage</option>
            <option value="ADJUSTMENT">Stock-Take Surplus</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-green-600">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Inbound Units</p>
          <p className="text-2xl font-black text-green-700 tabular-nums">+{totalInbound}</p>
          <p className="text-[11px] text-gray-400">Restocked or returned to warehouse</p>
        </div>

        <div className="stat-card border-l-4 border-l-[#C62828]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Outbound Units</p>
          <p className="text-2xl font-black text-[#C62828] tabular-nums">-{totalOutbound}</p>
          <p className="text-[11px] text-gray-400">Sold via invoices or shrinkage</p>
        </div>

        <div className="stat-card border-l-4 border-l-[#111111]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Audit Entries</p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">{movements.length}</p>
          <p className="text-[11px] text-gray-400">Total events logged</p>
        </div>
      </div>

      {/* Movements Table */}
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Date & Time</th>
                <th className="table-header text-left">Movement Type</th>
                <th className="table-header text-left">Product & Variant</th>
                <th className="table-header text-center">SKU</th>
                <th className="table-header text-center">Quantity</th>
                <th className="table-header text-right">Unit Buy Cost</th>
                <th className="table-header text-right">Unit Sell Price</th>
                <th className="table-header text-left">Supplier / Reference / Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-xs text-gray-400">Loading audit log...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-xs text-gray-400">No stock movements found.</td></tr>
              ) : (
                movements.map(m => {
                  const isInbound = m.qty > 0
                  return (
                    <tr key={m.id} className="table-row">
                      <td className="table-cell text-xs text-gray-500 font-mono">
                        {format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 border ${
                          m.type === 'INBOUND' ? 'bg-green-50 text-green-800 border-green-200' :
                          m.type === 'SALE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          m.type === 'SHRINKAGE' ? 'bg-red-50 text-[#C62828] border-red-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {isInbound ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                          {m.type}
                        </span>
                      </td>
                      <td className="table-cell text-xs font-semibold text-[#111111]">
                        {m.variant.product.name}
                        <span className="text-gray-500 font-normal"> — {m.variant.color} / {m.variant.size}</span>
                      </td>
                      <td className="table-cell text-center font-mono text-xs text-gray-400">{m.variant.sku}</td>
                      <td className={`table-cell text-center tabular-nums text-xs font-black ${isInbound ? 'text-green-700' : 'text-[#C62828]'}`}>
                        {isInbound ? `+${m.qty}` : m.qty}
                      </td>
                      <td className="table-cell text-right tabular-nums text-xs text-gray-600">
                        {formatCurrency(m.buyingPrice)}
                      </td>
                      <td className="table-cell text-right tabular-nums text-xs font-bold text-[#111111]">
                        {formatCurrency(m.sellingPrice)}
                      </td>
                      <td className="table-cell text-xs text-gray-600">
                        {m.supplier && <span className="font-semibold text-gray-700">{m.supplier} • </span>}
                        {m.notes || m.referenceId || 'System recorded'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
