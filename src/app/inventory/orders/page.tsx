'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  Download,
  Share2,
  Copy,
  ArrowDownToLine,
  Search,
  RefreshCw,
  FileText,
  Package,
  Layers,
  Check,
  Loader2,
  ChevronRight
} from 'lucide-react'

interface AggregatedItem {
  key: string
  productName: string
  color: string
  size: string
  sku: string
  currentStock: number
  totalUnitsNeeded: number
  deficitUnits: number
  estUnitBuyPrice: number
  estTotalCost: number
  quotations: Array<{
    documentId: string
    refNumber: string
    clientName: string
    clientPhone?: string | null
    issueDate: string
    qty: number
    notes?: string | null
  }>
}

interface OrderData {
  supplier: string
  generatedAt: string
  summary: {
    totalUnitsToOrder: number
    distinctVariantsCount: number
    activeQuotationsCount: number
    totalEstimatedCost: number
  }
  aggregatedOrders: AggregatedItem[]
  individualLines: Array<{
    id: string
    documentId: string
    refNumber: string
    clientName: string
    issueDate: string
    description: string
    notes?: string | null
    productName: string
    color: string
    size: string
    sku: string
    qty: number
    currentStock: number
    deficitUnits: number
    estUnitBuyPrice: number
    estTotalCost: number
  }>
  qualifyingQuotes: Array<{
    id: string
    refNumber: string
    status: string
    issueDate: string
    client: {
      id: string
      name: string
      phone?: string | null
      city?: string | null
    }
    itemsCount: number
  }>
}

export default function OrderListPage() {
  const [data, setData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewTab, setViewTab] = useState<'aggregated' | 'quotes'>('aggregated')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadOrderList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/orders')
      const json = await res.json()
      if (res.ok && json.data) {
        setData(json.data)
      } else {
        toast(json.error || 'Failed to fetch order list', 'error')
      }
    } catch (err: any) {
      toast('Network error loading order list', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrderList()
  }, [loadOrderList])

  const filteredAggregated = (data?.aggregatedOrders || []).filter(item => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      item.productName.toLowerCase().includes(term) ||
      item.color.toLowerCase().includes(term) ||
      item.size.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term)
    )
  })

  // Export to CSV
  const handleDownloadCsv = () => {
    if (!data || data.aggregatedOrders.length === 0) {
      toast('No orders available to export', 'error')
      return
    }

    const headers = [
      '#',
      'Product Name',
      'Color',
      'Size',
      'SKU',
      'Current Stock',
      'Quantity to Order',
      'Est Unit Cost (USD)',
      'Est Total Cost (USD)',
      'Client Quotations'
    ]

    const rows = data.aggregatedOrders.map((item, idx) => [
      idx + 1,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.color.replace(/"/g, '""')}"`,
      `"${item.size.replace(/"/g, '""')}"`,
      `"${item.sku.replace(/"/g, '""')}"`,
      item.currentStock,
      item.totalUnitsNeeded,
      item.estUnitBuyPrice.toFixed(2),
      item.estTotalCost.toFixed(2),
      `"${item.quotations.map(q => `${q.refNumber} (${q.clientName} x${q.qty})`).join('; ')}"`
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PodMyth_TANC_Order_List_${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV downloaded successfully', 'success')
  }

  // Copy formatted text for WhatsApp messaging to TANC
  const handleCopyWhatsApp = () => {
    if (!data || data.aggregatedOrders.length === 0) {
      toast('No orders to copy', 'error')
      return
    }

    const dateStr = format(new Date(), 'dd MMMM yyyy')
    let message = `*PODMYTH GROUP - TANC ORDER LIST*\n`
    message += `Date: ${dateStr}\n`
    message += `Total Units to Produce: ${data.summary.totalUnitsToOrder}\n`
    message += `------------------------------------\n`

    data.aggregatedOrders.forEach((item, idx) => {
      message += `${idx + 1}. *${item.productName}*\n`
      message += `   Color: ${item.color} | Size: ${item.size}\n`
      message += `   Quantity: *${item.totalUnitsNeeded} units*\n`
      if (item.sku !== 'CUSTOM') {
        message += `   SKU: ${item.sku}\n`
      }
      message += `\n`
    })

    message += `------------------------------------\n`
    message += `Please confirm receipt and estimated dispatch date.`

    navigator.clipboard.writeText(message)
    setCopied(true)
    toast('Order list copied for WhatsApp!', 'success')
    setTimeout(() => setCopied(false), 3000)
  }

  // Direct PDF Download using html2canvas & jspdf
  const handleDownloadPdf = async () => {
    if (!data || data.aggregatedOrders.length === 0) {
      toast('No orders available to export', 'error')
      return
    }

    try {
      setDownloadingPdf(true)
      toast('Generating TANC Order PDF...', 'info')

      const el = document.getElementById('tanc-order-sheet')
      if (!el) {
        toast('Order sheet template not found', 'error')
        return
      }

      // Temporarily reveal template for capture
      el.classList.remove('hidden')
      await new Promise(r => setTimeout(r, 150))

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      })

      el.classList.add('hidden')

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297))
      const fileName = `PodMyth_TANC_Production_Order_${format(new Date(), 'yyyyMMdd')}.pdf`
      pdf.save(fileName)
      toast('Order PDF downloaded successfully', 'success')
    } catch (err: any) {
      console.error(err)
      toast('Failed to download PDF', 'error')
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C62828] bg-red-50 border border-red-200 px-2 py-0.5">
              SUPPLIER RESTOCK PIPELINE
            </span>
            <span className="text-xs text-gray-400">• Supplier: TANC</span>
          </div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-1">
            TANC Order &amp; Production List
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-compiled order requirements for out-of-stock items quoted to clients.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loading || !data?.aggregatedOrders.length}
            className="btn-primary text-xs flex items-center gap-1.5"
            title="Download official corporate PDF for TANC"
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF (TANC)
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={loading || !data?.aggregatedOrders.length}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Download CSV spreadsheet"
          >
            <Download size={14} />
            CSV Export
          </button>

          <button
            onClick={handleCopyWhatsApp}
            disabled={loading || !data?.aggregatedOrders.length}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Copy formatted text to send on WhatsApp"
          >
            {copied ? <Check size={14} className="text-[#C62828]" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy for WhatsApp'}
          </button>

          <Link
            href="/inventory/receive"
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowDownToLine size={14} />
            Receive Stock
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-[#C62828] p-4 bg-white">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Units to Order
          </p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">
            {data?.summary.totalUnitsToOrder ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Physical apparel items</p>
        </div>

        <div className="card border-l-4 border-l-[#111111] p-4 bg-white">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Distinct Variants
          </p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">
            {data?.summary.distinctVariantsCount ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Unique style / color / size lines</p>
        </div>

        <div className="card border-l-4 border-l-[#111111] p-4 bg-white">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Customer Quotations
          </p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">
            {data?.summary.activeQuotationsCount ?? 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Pressed orders awaiting restock</p>
        </div>

        <div className="card border-l-4 border-l-[#C62828] p-4 bg-white">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Estimated Supplier Cost
          </p>
          <p className="text-2xl font-black text-[#C62828] tabular-nums">
            {formatCurrency(data?.summary.totalEstimatedCost ?? 0)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Estimated wholesale buying total</p>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewTab('aggregated')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              viewTab === 'aggregated'
                ? 'border-b-[#C62828] text-[#111111]'
                : 'border-b-transparent text-gray-500 hover:text-[#111111]'
            }`}
          >
            Aggregated Supplier Order ({data?.aggregatedOrders.length ?? 0})
          </button>
          <button
            onClick={() => setViewTab('quotes')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              viewTab === 'quotes'
                ? 'border-b-[#C62828] text-[#111111]'
                : 'border-b-transparent text-gray-500 hover:text-[#111111]'
            }`}
          >
            Client Quotation Breakdown ({data?.qualifyingQuotes.length ?? 0})
          </button>
        </div>

        {viewTab === 'aggregated' && (
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, color, size..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#E5E5E5] focus:border-[#111111] focus:outline-none bg-white"
            />
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="card p-12 text-center text-xs text-gray-400">
          Loading order list from database...
        </div>
      ) : data?.aggregatedOrders.length === 0 ? (
        <div className="card p-12 text-center space-y-3 bg-white">
          <Package size={32} className="mx-auto text-gray-300" />
          <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
            No Out-of-Stock Orders Pending
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            All active quotations currently have sufficient inventory or no out-of-stock items have been quoted. When an out-of-stock item is quoted, it automatically populates here.
          </p>
          <div className="pt-2">
            <Link href="/quotations/new" className="btn-secondary text-xs">
              Create New Quotation
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: AGGREGATED VIEW FOR TANC */}
          {viewTab === 'aggregated' && (
            <div className="card p-0 overflow-hidden bg-white border border-[#E5E5E5]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#111111] text-white text-[11px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4 w-12">#</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Color</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-center">Stock</th>
                      <th className="py-3 px-4 text-center bg-[#C62828]">Order Qty</th>
                      <th className="py-3 px-4 text-right">Est. Unit Cost</th>
                      <th className="py-3 px-4 text-right">Est. Total</th>
                      <th className="py-3 px-4">Client Demands</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] text-xs">
                    {filteredAggregated.map((item, idx) => (
                      <tr key={item.key} className="hover:bg-[#F8F9FA] transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-[#111111]">
                          {item.productName}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#111111]">{item.color}</td>
                        <td className="py-3 px-4 font-medium text-[#111111]">{item.size}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500">{item.sku}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-400 tabular-nums">
                          {item.currentStock}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-white bg-[#C62828] tabular-nums text-sm">
                          {item.totalUnitsNeeded}
                        </td>
                        <td className="py-3 px-4 text-right font-medium tabular-nums text-gray-600">
                          {formatCurrency(item.estUnitBuyPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-[#111111]">
                          {formatCurrency(item.estTotalCost)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.quotations.map(q => (
                              <Link
                                key={q.refNumber}
                                href={`/quotations/${q.documentId}`}
                                className="inline-block text-[10px] font-mono font-bold bg-[#F5F5F5] border border-[#E5E5E5] px-1.5 py-0.5 text-[#111111] hover:border-[#C62828]"
                                title={`${q.clientName} (${q.qty} units)`}
                              >
                                {q.refNumber} ({q.qty})
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F8F9FA] border-t-2 border-[#111111] font-black text-xs text-[#111111]">
                      <td colSpan={6} className="py-3 px-4 uppercase text-right">
                        Total Order Requirement:
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-[#C62828] bg-red-50 font-black tabular-nums">
                        {data?.summary.totalUnitsToOrder}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">Total:</td>
                      <td className="py-3 px-4 text-right text-sm text-[#C62828] tabular-nums">
                        {formatCurrency(data?.summary.totalEstimatedCost ?? 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: QUOTATION BREAKDOWN */}
          {viewTab === 'quotes' && (
            <div className="space-y-4">
              {data?.qualifyingQuotes.map(q => {
                const quoteLines = (data?.individualLines || []).filter(
                  l => l.documentId === q.id
                )
                return (
                  <div key={q.id} className="card p-5 bg-white border border-[#E5E5E5] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#C62828]">
                            {q.refNumber}
                          </span>
                          <span className="text-[10px] font-bold text-white bg-[#111111] px-2 py-0.5 uppercase tracking-wider">
                            {q.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#111111] mt-0.5">
                          {q.client.name} {q.client.phone ? `(${q.client.phone})` : ''} {q.client.city ? `• ${q.client.city}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Quoted: {format(new Date(q.issueDate), 'd MMMM yyyy')}
                        </span>
                        <Link
                          href={`/quotations/${q.id}`}
                          className="btn-secondary text-xs flex items-center gap-1"
                        >
                          View Quotation &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* Pressed items for this quote */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E5E5E5] text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                            <th className="py-2">Item Description</th>
                            <th className="py-2">Color</th>
                            <th className="py-2">Size</th>
                            <th className="py-2">SKU</th>
                            <th className="py-2 text-center">Current Stock</th>
                            <th className="py-2 text-center font-bold text-[#C62828]">Qty Needed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5E5]">
                          {quoteLines.map(l => (
                            <tr key={l.id}>
                              <td className="py-2 font-semibold text-[#111111]">{l.productName}</td>
                              <td className="py-2 text-gray-700">{l.color}</td>
                              <td className="py-2 text-gray-700">{l.size}</td>
                              <td className="py-2 font-mono text-[11px] text-gray-500">{l.sku}</td>
                              <td className="py-2 text-center text-gray-400 font-mono">{l.currentStock}</td>
                              <td className="py-2 text-center font-black text-[#C62828] text-sm tabular-nums">
                                {l.qty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HIDDEN PRINT / PDF TEMPLATE FOR TANC EXPORT */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="tanc-order-sheet"
        className="hidden bg-white p-12 w-[800px] text-black font-sans min-h-[1100px] flex-col justify-between"
        style={{ fontFamily: "'Helvetica Neue', Inter, sans-serif" }}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#111111] pb-4">
            <div>
              <div className="text-[26px] font-black tracking-wider leading-none">
                <span className="text-[#111111]">POD</span>
                <span className="text-[#C62828]">MYTH</span>
                <span className="text-[#111111]"> GROUP</span>
              </div>
              <p className="text-[9px] font-black tracking-[3px] text-[#C62828] uppercase mt-1">
                PODMERCH SUBSIDIARY • HARARE, ZIMBABWE
              </p>
              <p className="text-[10px] text-[#555555] mt-2">Call: +263 784 881 010 • sales@podmyth.co.zw</p>
            </div>

            <div className="text-right">
              <h2 className="text-[18px] font-black text-[#111111] tracking-[3px] uppercase">
                PRODUCTION ORDER
              </h2>
              <div className="w-[32px] h-[2px] bg-[#C62828] ml-auto mt-1" />
              <div className="text-[10px] text-[#555555] mt-2 space-y-0.5">
                <div>
                  Order Ref: <span className="font-mono font-bold text-[#111111]">PO-TANC-{format(new Date(), 'yyyyMMdd')}</span>
                </div>
                <div>Date: {format(new Date(), 'd MMMM yyyy')}</div>
                <div>Supplier: <strong className="text-[#111111]">TANC APPAREL</strong></div>
              </div>
            </div>
          </div>

          {/* Supplier Instruction Box */}
          <div className="my-6 p-4 bg-[#FAFAFA] border border-[#E2E2E2] text-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#111111] mb-1">
              PRODUCTION SPECIFICATIONS &amp; DISPATCH
            </p>
            <p className="text-[11px] text-[#555555] leading-relaxed">
              Please manufacture and prepare the following medical apparel items for delivery to PodMyth Harare warehouse. All garments must conform to PodMyth quality standards and sizing specs.
            </p>
          </div>

          {/* Line Items Table */}
          <table className="w-full border-collapse text-xs mb-6" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderTop: '1.5px solid #111111', borderBottom: '1.5px solid #111111' }}>
                <th className="py-2.5 px-2 text-left font-black uppercase text-[10px] text-[#111111]" style={{ width: '35px' }}>#</th>
                <th className="py-2.5 px-2 text-left font-black uppercase text-[10px] text-[#111111]">Product Description</th>
                <th className="py-2.5 px-2 text-left font-black uppercase text-[10px] text-[#111111]" style={{ width: '90px' }}>Color</th>
                <th className="py-2.5 px-2 text-center font-black uppercase text-[10px] text-[#111111]" style={{ width: '60px' }}>Size</th>
                <th className="py-2.5 px-2 text-left font-black uppercase text-[10px] text-[#111111]" style={{ width: '130px' }}>SKU</th>
                <th className="py-2.5 px-2 text-right font-black uppercase text-[10px] text-[#C62828]" style={{ width: '80px' }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {(data?.aggregatedOrders || []).map((it, idx) => (
                <tr key={it.key} style={{ borderBottom: '1px solid #EBEBEB' }}>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-gray-500">{idx + 1}</td>
                  <td className="py-2.5 px-2 font-bold text-[#111111]">{it.productName}</td>
                  <td className="py-2.5 px-2 text-[#555555]">{it.color}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-[#111111]">{it.size}</td>
                  <td className="py-2.5 px-2 font-mono text-[10px] text-gray-500">{it.sku}</td>
                  <td className="py-2.5 px-2 text-right font-black text-sm text-[#111111] tabular-nums">
                    {it.totalUnitsNeeded}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1.5px solid #111111', borderBottom: '1.5px solid #111111' }}>
                <td colSpan={5} className="py-3 px-2 font-black uppercase text-[11px] text-[#111111] text-right">
                  Total Units to Supply:
                </td>
                <td className="py-3 px-2 text-right font-black text-base text-[#C62828] tabular-nums">
                  {data?.summary.totalUnitsToOrder ?? 0}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-[1.5px] border-[#111111] flex justify-between items-center text-[10px] text-[#555555]">
          <div>
            <span className="font-black text-[#111111] uppercase tracking-wider">PODMYTH GROUP • PodMerch Subsidiary</span>
            <p className="mt-0.5">Authorised Official Purchase Order Document</p>
          </div>
          <div className="text-right">
            <span>Thank you for partnering with PodMyth</span>
          </div>
        </div>
      </div>
    </div>
  )
}
