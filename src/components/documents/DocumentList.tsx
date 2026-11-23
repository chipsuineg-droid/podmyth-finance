'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { Search, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'

type DocType = 'INVOICE' | 'QUOTATION'

interface DocRow {
  id: string
  refNumber: string
  status: string
  type: string
  client: { name: string }
  totalSellPrice: number
  netProfit: number
  profitMargin: number
  amountPaid: number
  issueDate: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  DELIVERED_PENDING: 'Pending Payment',
  PAID: 'Paid',
  PARTIAL: 'Partial Payment',
  VOID: 'Void',
  CANCELLED: 'Cancelled',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  ORDER_PRESSED: 'ORDER PRESSED: AWAITING STOCK',
  STOCK_READY: 'STOCK READY: READY TO INVOICE',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ORDER_PRESSED') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-white text-[#C62828] border border-[#C62828]">
        ORDER PRESSED: AWAITING STOCK
      </span>
    )
  }
  if (status === 'STOCK_READY') {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#111111] text-white border border-[#111111]">
        STOCK READY: READY TO INVOICE
      </span>
    )
  }

  const cls = {
    PAID: 'badge-paid',
    ACCEPTED: 'badge-paid',
    DELIVERED_PENDING: 'badge-pending',
    PARTIAL: 'badge-pending',
    SENT: 'badge-draft',
    DRAFT: 'badge-draft',
    ISSUED: 'badge-draft',
    VOID: 'badge-void',
    CANCELLED: 'badge-void',
    REJECTED: 'badge-void',
  }[status] ?? 'badge-draft'
  return <span className={cls}>{STATUS_LABELS[status] ?? status}</span>
}

export function DocumentList({ type }: { type: DocType }) {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/documents?type=${type}&q=${encodeURIComponent(q)}`)
    const json = await res.json()
    setDocs((json.data ?? []).map((d: any) => ({
      ...d,
      totalSellPrice: Number(d.totalSellPrice),
      netProfit: Number(d.netProfit),
      profitMargin: Number(d.profitMargin),
      amountPaid: Number(d.amountPaid),
    })))
    setLoading(false)
  }, [type, q])

  useEffect(() => { load() }, [load])

  const isInvoice = type === 'INVOICE'
  const label = isInvoice ? 'Invoice' : 'Quotation'
  const newPath = isInvoice ? '/invoices/new' : '/quotations/new'
  const detailPath = isInvoice ? '/invoices' : '/quotations'

  const pressedOrdersCount = docs.filter(d => d.status === 'ORDER_PRESSED').length
  const stockReadyCount = docs.filter(d => d.status === 'STOCK_READY').length

  const filteredDocs = docs.filter(d => {
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'ORDER_PRESSED') return d.status === 'ORDER_PRESSED'
    if (statusFilter === 'STOCK_READY') return d.status === 'STOCK_READY'
    if (statusFilter === 'PAID') return d.status === 'PAID'
    if (statusFilter === 'PENDING') return d.status === 'DELIVERED_PENDING' || d.status === 'PARTIAL'
    return true
  })

  const totalRevenue = docs.reduce((s, d) => s + d.totalSellPrice, 0)
  const totalProfit = docs.reduce((s, d) => s + d.netProfit, 0)
  const totalCollected = docs.reduce((s, d) => s + d.amountPaid, 0)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">{label}s</h1>
          <p className="text-sm text-gray-500 mt-1">{docs.length} {label.toLowerCase()}s total</p>
        </div>
        <Link href={newPath} className="btn-primary flex items-center gap-2">
          <Plus size={15} />
          New {label}
        </Link>
      </div>

      {/* Stats */}
      {isInvoice && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card border-l-4 border-l-[#111111]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Billed</p>
            <p className="text-xl font-black tabular-nums">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="stat-card border-l-4 border-l-[#111111]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Net Profit</p>
            <p className={`text-xl font-black tabular-nums ${totalProfit < 0 ? 'text-[#C62828]' : 'text-[#111111]'}`}>{formatCurrency(totalProfit)}</p>
          </div>
          <div className="stat-card border-l-4 border-l-[#C62828]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Collected</p>
            <p className="text-xl font-black tabular-nums text-[#C62828]">{formatCurrency(totalCollected)}</p>
          </div>
        </div>
      )}

      {/* Quotation Orders Pressed Alert */}
      {!isInvoice && pressedOrdersCount > 0 && (
        <div className="mb-6 card border-l-4 border-l-[#C62828] p-4 flex items-center justify-between bg-white">
          <div>
            <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Orders Pressed / Awaiting Stock: {pressedOrdersCount} Quotation{pressedOrdersCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              These quotations exceed current physical stock. Receiving shipments in the Stock Catalog will automatically mark them ready.
            </p>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'ORDER_PRESSED' ? 'ALL' : 'ORDER_PRESSED')}
            className="text-xs font-bold text-[#111111] border border-[#E5E5E5] bg-white px-3 py-1.5 hover:bg-[#F8F9FA] transition-colors"
          >
            {statusFilter === 'ORDER_PRESSED' ? 'Show All' : 'Filter Pressed Orders'}
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder={`Search ${label.toLowerCase()}s or clients...`}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        {!isInvoice && (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 font-semibold border ${statusFilter === 'ALL' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5]'}`}
            >
              All ({docs.length})
            </button>
            <button
              onClick={() => setStatusFilter('ORDER_PRESSED')}
              className={`px-3 py-1.5 font-semibold border ${statusFilter === 'ORDER_PRESSED' ? 'bg-[#C62828] text-white border-[#C62828]' : 'bg-white text-[#C62828] border-[#C62828]'}`}
            >
              Orders Pressed ({pressedOrdersCount})
            </button>
            <button
              onClick={() => setStatusFilter('STOCK_READY')}
              className={`px-3 py-1.5 font-semibold border ${statusFilter === 'STOCK_READY' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E5E5E5]'}`}
            >
              Stock Ready ({stockReadyCount})
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Ref #</th>
                <th className="table-header text-left">Client</th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-right">Amount</th>
                {isInvoice && <th className="table-header text-right">Collected</th>}
                <th className="table-header text-left">Status</th>
                <th className="table-header text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400">Loading...</td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                    No {label.toLowerCase()}s found
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="table-row">
                    <td className="table-cell font-mono text-xs font-semibold">
                      <Link href={`${detailPath}/${doc.id}`} className="hover:text-[#C62828] hover:underline">
                        {doc.refNumber}
                      </Link>
                    </td>
                    <td className="table-cell font-medium">{doc.client.name}</td>
                    <td className="table-cell text-gray-500 text-xs">
                      {format(new Date(doc.issueDate), 'dd MMM yyyy')}
                    </td>
                    <td className="table-cell text-right font-bold tabular-nums">
                      {formatCurrency(doc.totalSellPrice)}
                    </td>
                    {isInvoice && (
                      <td className="table-cell text-right font-medium tabular-nums text-gray-600">
                        {formatCurrency(doc.amountPaid)}
                      </td>
                    )}
                    <td className="table-cell">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="table-cell text-right">
                      <Link
                        href={`${detailPath}/${doc.id}`}
                        className="text-xs font-semibold text-gray-500 hover:text-[#111111] hover:underline"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
