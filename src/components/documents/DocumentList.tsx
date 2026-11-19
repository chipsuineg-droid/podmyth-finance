'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { Search, Plus, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'

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
  DRAFT: 'Draft', ISSUED: 'Issued', DELIVERED_PENDING: 'Pending Payment',
  PAID: 'Paid', PARTIAL: 'Partial', VOID: 'Void', CANCELLED: 'Cancelled',
  SENT: 'Sent', ACCEPTED: 'Accepted', REJECTED: 'Rejected',
}

function StatusBadge({ status }: { status: string }) {
  const cls = {
    PAID: 'badge-paid', ACCEPTED: 'badge-paid',
    DELIVERED_PENDING: 'badge-pending', PARTIAL: 'badge-pending', SENT: 'badge-pending',
    DRAFT: 'badge-draft', ISSUED: 'badge-draft',
    VOID: 'badge-void', CANCELLED: 'badge-void', REJECTED: 'badge-void',
  }[status] ?? 'badge-draft'
  return <span className={cls}>{STATUS_LABELS[status] ?? status}</span>
}

export function DocumentList({ type }: { type: DocType }) {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [q, setQ] = useState('')
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
          <div className={`stat-card border-l-4 ${totalProfit >= 0 ? 'border-l-green-500' : 'border-l-[#C62828]'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Net Profit</p>
            <p className={`text-xl font-black tabular-nums ${totalProfit < 0 ? 'text-[#C62828]' : ''}`}>{formatCurrency(totalProfit)}</p>
          </div>
          <div className="stat-card border-l-4 border-l-amber-500">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Collected</p>
            <p className="text-xl font-black tabular-nums">{formatCurrency(totalCollected)}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder={`Search ${label.toLowerCase()}s or clients...`}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
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
                {isInvoice && <th className="table-header text-right">Profit</th>}
                {isInvoice && <th className="table-header text-right">Collected</th>}
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                  No {label.toLowerCase()}s found. <Link href={newPath} className="text-[#C62828] hover:underline">Create one →</Link>
                </td></tr>
              ) : docs.map(doc => (
                <tr key={doc.id} className="table-row">
                  <td className="table-cell">
                    <Link href={`${detailPath}/${doc.id}`} className="font-mono text-xs text-[#C62828] hover:underline font-bold">
                      {doc.refNumber}
                    </Link>
                  </td>
                  <td className="table-cell font-medium">{doc.client.name}</td>
                  <td className="table-cell text-gray-500 text-xs">{format(new Date(doc.issueDate), 'd MMM yyyy')}</td>
                  <td className="table-cell text-right tabular-nums font-semibold">{formatCurrency(doc.totalSellPrice)}</td>
                  {isInvoice && (
                    <td className={`table-cell text-right tabular-nums font-semibold ${doc.netProfit < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {doc.netProfit < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        {formatCurrency(doc.netProfit)}
                      </div>
                    </td>
                  )}
                  {isInvoice && (
                    <td className="table-cell text-right tabular-nums text-gray-600">{formatCurrency(doc.amountPaid)}</td>
                  )}
                  <td className="table-cell"><StatusBadge status={doc.status} /></td>
                  <td className="table-cell">
                    <Link href={`${detailPath}/${doc.id}`} className="text-xs text-[#111111] hover:text-[#C62828] font-semibold underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
