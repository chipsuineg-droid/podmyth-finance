'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  ArrowLeft, User, Phone, MapPin, DollarSign, TrendingUp,
  Receipt, FileText, Clock, Plus
} from 'lucide-react'

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`)
      const json = await res.json()
      if (!res.ok) {
        toast('Client not found', 'error')
        return
      }
      setClient(json.data)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadClient()
  }, [loadClient])

  if (loading) return <div className="p-8 text-center text-sm text-gray-400">Loading client profile...</div>
  if (!client) return <div className="p-8 text-center text-sm text-gray-500">Client profile not found.</div>

  const invoices = (client.documents || []).filter((d: any) => d.type === 'INVOICE')
  const quotations = (client.documents || []).filter((d: any) => d.type === 'QUOTATION')

  const totalBilled = invoices
    .filter((d: any) => d.status !== 'VOID')
    .reduce((s: number, d: any) => s + Number(d.totalSellPrice), 0)

  const totalCollected = invoices
    .filter((d: any) => d.status !== 'VOID')
    .reduce((s: number, d: any) => s + Number(d.amountPaid), 0)

  const totalProfit = invoices
    .filter((d: any) => d.status !== 'VOID')
    .reduce((s: number, d: any) => s + Number(d.netProfit), 0)

  const arBalance = totalBilled - totalCollected

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="p-2 border border-[#E5E5E5] hover:bg-[#F8F9FA]">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#111111]">{client.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Client profile & transaction ledger
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/quotations/new`} className="btn-secondary text-xs">
            + New Quote
          </Link>
          <Link href={`/invoices/new`} className="btn-primary text-xs">
            + New Invoice
          </Link>
        </div>
      </div>

      {/* Info Card & Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card md:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Client Contact</h2>
          <div className="space-y-1.5 text-xs text-gray-700">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-gray-400" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.city && (
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-gray-400" />
                <span>{client.city}{client.deliveryZone ? ` • ${client.deliveryZone}` : ''}</span>
              </div>
            )}
            {client.email && (
              <div className="text-gray-500">{client.email}</div>
            )}
            {client.notes && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5] text-[11px] text-gray-500 italic">
                {client.notes}
              </div>
            )}
          </div>
        </div>

        <div className="stat-card border-l-4 border-l-[#111111]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Billed</p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">{formatCurrency(totalBilled)}</p>
          <p className="text-[11px] text-gray-400 mt-1">{invoices.length} invoices issued</p>
        </div>

        <div className={`stat-card border-l-4 ${totalProfit >= 0 ? 'border-l-green-600' : 'border-l-[#C62828]'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Profit Generated</p>
          <p className={`text-2xl font-black tabular-nums ${totalProfit < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
            {formatCurrency(totalProfit)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Cumulative net profit</p>
        </div>

        <div className={`stat-card border-l-4 ${arBalance > 0 ? 'border-l-[#C62828]' : 'border-l-gray-300'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Outstanding Balance</p>
          <p className={`text-2xl font-black tabular-nums ${arBalance > 0 ? 'text-[#C62828]' : 'text-gray-800'}`}>
            {formatCurrency(arBalance)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {arBalance > 0 ? 'Unpaid balance due' : 'Fully settled'}
          </p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#111111] flex items-center gap-2">
            <Receipt size={14} className="text-[#C62828]" />
            Invoices History
          </h2>
          <span className="text-xs text-gray-500">{invoices.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Invoice #</th>
                <th className="table-header text-left">Issue Date</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-right">Profit</th>
                <th className="table-header text-right">Paid</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">No invoices yet.</td></tr>
              ) : invoices.map((inv: any) => (
                <tr key={inv.id} className="table-row">
                  <td className="table-cell font-mono font-bold text-xs text-[#C62828]">
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.refNumber}</Link>
                  </td>
                  <td className="table-cell text-xs text-gray-600">{format(new Date(inv.issueDate), 'd MMM yyyy')}</td>
                  <td className="table-cell text-right tabular-nums text-xs font-bold">{formatCurrency(Number(inv.totalSellPrice))}</td>
                  <td className={`table-cell text-right tabular-nums text-xs font-semibold ${Number(inv.netProfit) < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
                    {formatCurrency(Number(inv.netProfit))}
                  </td>
                  <td className="table-cell text-right tabular-nums text-xs text-gray-600">{formatCurrency(Number(inv.amountPaid))}</td>
                  <td className="table-cell text-xs font-semibold">{inv.status}</td>
                  <td className="table-cell text-center">
                    <Link href={`/invoices/${inv.id}`} className="text-xs text-[#111111] hover:text-[#C62828] underline font-bold">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotations List */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#111111] flex items-center gap-2">
            <FileText size={14} className="text-[#111111]" />
            Quotations
          </h2>
          <span className="text-xs text-gray-500">{quotations.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Quote #</th>
                <th className="table-header text-left">Issue Date</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">No quotations recorded.</td></tr>
              ) : quotations.map((qt: any) => (
                <tr key={qt.id} className="table-row">
                  <td className="table-cell font-mono font-bold text-xs text-[#111111]">
                    <Link href={`/quotations/${qt.id}`} className="hover:underline">{qt.refNumber}</Link>
                  </td>
                  <td className="table-cell text-xs text-gray-600">{format(new Date(qt.issueDate), 'd MMM yyyy')}</td>
                  <td className="table-cell text-right tabular-nums text-xs font-bold">{formatCurrency(Number(qt.totalSellPrice))}</td>
                  <td className="table-cell text-xs font-semibold">{qt.status}</td>
                  <td className="table-cell text-center">
                    <Link href={`/quotations/${qt.id}`} className="text-xs text-[#111111] hover:text-[#C62828] underline font-bold">
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
