'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/finance'
import { Search, Plus, AlertTriangle, ArrowDownToLine, RefreshCw, ClipboardList, Filter } from 'lucide-react'

interface VariantItem {
  id: string
  sku: string
  color: string
  size: string
  stockQty: number
  lowStockThreshold: number
  defaultBuyPrice: number
  defaultSellPrice: number
  product: {
    id: string
    name: string
    isService: boolean
    category: {
      id: string
      name: string
    }
  }
}

export default function InventoryCatalogPage() {
  const [variants, setVariants] = useState<VariantItem[]>([])
  const [pressedQuotes, setPressedQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const loadVariants = useCallback(async () => {
    setLoading(true)
    try {
      const [res, quoteRes] = await Promise.all([
        fetch(`/api/inventory?lowStock=${lowStockOnly}`),
        fetch(`/api/documents?type=QUOTATION&status=ORDER_PRESSED`),
      ])
      const json = await res.json()
      const quoteJson = await quoteRes.json()
      setVariants((json.data ?? []).map((v: any) => ({
        ...v,
        defaultBuyPrice: Number(v.defaultBuyPrice),
        defaultSellPrice: Number(v.defaultSellPrice),
      })))
      setPressedQuotes(quoteJson.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [lowStockOnly])

  useEffect(() => {
    loadVariants()
  }, [loadVariants])

  const filtered = variants.filter(v => {
    if (categoryFilter !== 'ALL' && v.product.category.name !== categoryFilter) return false
    if (!q) return true
    const term = q.toLowerCase()
    return (
      v.product.name.toLowerCase().includes(term) ||
      v.sku.toLowerCase().includes(term) ||
      v.color.toLowerCase().includes(term) ||
      v.size.toLowerCase().includes(term)
    )
  })

  // Summary stats
  const totalPhysicalUnits = variants
    .filter(v => !v.product.isService)
    .reduce((s, v) => s + v.stockQty, 0)

  const totalInventoryValuation = variants
    .filter(v => !v.product.isService)
    .reduce((s, v) => s + v.stockQty * v.defaultSellPrice, 0)

  const lowStockCount = variants
    .filter(v => !v.product.isService && v.stockQty <= v.lowStockThreshold).length

  const categories = Array.from(new Set(variants.map(v => v.product.category.name)))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">Stock & Inventory Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dynamic apparel variant tracking, unit costs, retail pricing & real-time inventory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/inventory/stocktake" className="btn-secondary text-xs flex items-center gap-1.5">
            <ClipboardList size={14} /> Stock Take Mode
          </Link>
          <Link href="/inventory/movements" className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={14} /> Movement Log
          </Link>
          <Link href="/inventory/receive" className="btn-primary text-xs flex items-center gap-1.5">
            <ArrowDownToLine size={14} /> Receive Stock
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-[#111111]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Stock Units</p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">{totalPhysicalUnits}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Physical apparel in warehouse</p>
        </div>

        <div className="stat-card border-l-4 border-l-green-600">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Stock Value (at Selling Price)</p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">{formatCurrency(totalInventoryValuation)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Asset valuation at retail selling value</p>
        </div>

        <div className={`stat-card border-l-4 ${lowStockCount > 0 ? 'border-l-[#C62828]' : 'border-l-gray-300'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Low-Stock Items (≤ 2)</p>
          <p className={`text-2xl font-black tabular-nums ${lowStockCount > 0 ? 'text-[#C62828]' : 'text-gray-800'}`}>
            {lowStockCount}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {lowStockCount > 0 ? 'Restock immediately' : 'All stock healthy'}
          </p>
        </div>
      </div>

      {/* Orders Pressed / Awaiting Stock Panel */}
      {pressedQuotes.length > 0 && (
        <div className="card border-l-4 border-l-[#C62828] p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              Orders Pressed / Awaiting Stock ({pressedQuotes.length} active order{pressedQuotes.length > 1 ? 's' : ''})
            </h2>
            <Link
              href="/inventory/receive"
              className="btn-primary text-xs"
            >
              Receive Stock to Fulfill &rarr;
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            The following quotations have requested items currently out of stock. Stock incoming via Receive Stock will automatically clear these orders for invoicing.
          </p>
          <div className="divide-y divide-[#E5E5E5] border-t border-[#E5E5E5]">
            {pressedQuotes.map((q: any) => (
              <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-[#C62828] mr-2">{q.refNumber}</span>
                  <span className="font-bold text-[#111111]">{q.client?.name}</span>
                  <span className="text-gray-500 ml-2">({(q.items || []).map((i: any) => `${i.qty}x ${i.description}`).join(', ')})</span>
                </div>
                <Link
                  href={`/quotations/${q.id}`}
                  className="font-bold text-[#111111] hover:text-[#C62828] hover:underline"
                >
                  View Quote &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 text-xs"
              placeholder="Search by product, color, size, or SKU..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>

          <select
            className="select text-xs w-44"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer border border-[#E5E5E5] px-3 py-2 bg-white">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={e => setLowStockOnly(e.target.checked)}
              className="accent-[#C62828]"
            />
            <span>Show Low Stock Only (≤ 2)</span>
          </label>
        </div>
      </div>

      {/* Inventory Catalog Table */}
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">SKU</th>
                <th className="table-header text-left">Product Name</th>
                <th className="table-header text-left">Color</th>
                <th className="table-header text-center">Size</th>
                <th className="table-header text-right">Buying Price (COGS)</th>
                <th className="table-header text-right">Selling Price</th>
                <th className="table-header text-right">Margin %</th>
                <th className="table-header text-center">Stock Level</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-xs text-gray-400">Loading catalog...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-xs text-gray-400">No matching products or variants found.</td></tr>
              ) : (
                filtered.map(v => {
                  const isService = v.product.isService
                  const isLow = !isService && v.stockQty <= v.lowStockThreshold
                  const isOut = !isService && v.stockQty === 0
                  const margin = v.defaultSellPrice > 0 ? ((v.defaultSellPrice - v.defaultBuyPrice) / v.defaultSellPrice) * 100 : 0

                  return (
                    <tr key={v.id} className="table-row">
                      <td className="table-cell font-mono text-xs text-gray-500 font-semibold">{v.sku}</td>
                      <td className="table-cell font-semibold text-xs text-[#111111]">
                        {v.product.name}
                        {isService && <span className="ml-2 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 border border-gray-200">SERVICE</span>}
                      </td>
                      <td className="table-cell text-xs text-gray-600">{v.color}</td>
                      <td className="table-cell text-center font-mono text-xs font-bold">{v.size}</td>
                      <td className="table-cell text-right tabular-nums text-xs text-gray-600 font-medium">
                        {formatCurrency(v.defaultBuyPrice)}
                      </td>
                      <td className="table-cell text-right tabular-nums text-xs font-bold text-[#111111]">
                        {formatCurrency(v.defaultSellPrice)}
                      </td>
                      <td className="table-cell text-right tabular-nums text-xs font-semibold text-[#111111]">
                        {margin.toFixed(0)}%
                      </td>
                      <td className="table-cell text-center tabular-nums text-xs font-black">
                        {isService ? 'N/A' : v.stockQty}
                      </td>
                      <td className="table-cell text-center">
                        {isService ? (
                          <span className="text-[10px] text-gray-400 uppercase">On-Demand</span>
                        ) : isOut ? (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-white text-[#C62828] border border-[#C62828] uppercase">
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-white text-[#C62828] border border-[#C62828] uppercase">
                            LOW ({v.stockQty})
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-[#111111] text-white border border-[#111111] uppercase">
                            IN STOCK
                          </span>
                        )}
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
