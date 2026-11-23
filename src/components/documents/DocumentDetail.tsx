'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency, formatPercent } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  Printer, ArrowRightCircle, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, DollarSign, Calendar, MapPin, Phone,
  ArrowLeft, CreditCard, ShieldCheck, Lock
} from 'lucide-react'

interface DocumentItem {
  id: string
  description: string
  notes?: string | null
  qty: number
  buyingPrice: number
  sellingPrice: number
  lineTotal: number
  lineCost: number
  lineProfit: number
}

interface Payment {
  id: string
  amount: number
  method: string
  paidAt: string
  notes?: string | null
}

interface DocumentData {
  id: string
  refNumber: string
  type: 'QUOTATION' | 'INVOICE'
  status: string
  client: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    city?: string | null
    deliveryZone?: string | null
  }
  issueDate: string
  dueDate?: string | null
  paidDate?: string | null
  paymentMethod?: string | null
  amountPaid: number
  totalSellPrice: number
  totalBuyPrice: number
  netProfit: number
  profitMargin: number
  notes?: string | null
  terms: string
  items: DocumentItem[]
  payments?: Payment[]
}

export function DocumentDetail({ id }: { id: string }) {
  const router = useRouter()
  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('USD_CASH')
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [payNotes, setPayNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'internal' | 'client'>('internal')

  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}`)
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Failed to load document', 'error')
        return
      }
      const d = json.data
      setDoc({
        ...d,
        amountPaid: Number(d.amountPaid),
        totalSellPrice: Number(d.totalSellPrice),
        totalBuyPrice: Number(d.totalBuyPrice),
        netProfit: Number(d.netProfit),
        profitMargin: Number(d.profitMargin),
        items: (d.items || []).map((it: any) => ({
          ...it,
          buyingPrice: Number(it.buyingPrice),
          sellingPrice: Number(it.sellingPrice),
          lineTotal: Number(it.lineTotal),
          lineCost: Number(it.lineCost),
          lineProfit: Number(it.lineProfit),
        })),
        payments: (d.payments || []).map((p: any) => ({
          ...p,
          amount: Number(p.amount),
        })),
      })
      const remaining = Number(d.totalSellPrice) - Number(d.amountPaid)
      setPayAmount(remaining > 0 ? remaining.toFixed(2) : '0.00')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDoc()
  }, [fetchDoc])

  const handleConvert = async (allowBackorder = false) => {
    if (!allowBackorder && !confirm('Convert this Quotation to an official Invoice? Stock will be deducted from the catalog.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/documents/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowBackorder })
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.canOverride) {
          if (confirm(`${json.error}\n\nDo you want to confirm a Backorder Override and proceed with invoice generation anyway?`)) {
            return handleConvert(true)
          }
        } else {
          toast(json.error || 'Conversion failed', 'error')
        }
        return
      }
      toast('Quotation converted to Invoice successfully!', 'success')
      router.push(`/invoices/${json.data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid amount', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/documents/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method: payMethod,
          paidAt: payDate,
          notes: payNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Failed to record payment', 'error')
        return
      }
      toast('Payment recorded successfully!', 'success')
      setShowPaymentModal(false)
      fetchDoc()
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoid = async () => {
    if (!confirm('Are you sure you want to void/delete this document? For invoices, stock will be automatically restored.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Failed to delete', 'error')
        return
      }
      toast('Document voided & removed', 'info')
      router.push(doc?.type === 'INVOICE' ? '/invoices' : '/quotations')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    setViewMode('client')
    setTimeout(() => {
      window.print()
    }, 150)
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading document details...</div>
  }

  if (!doc) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Document not found.</p>
        <Link href="/dashboard" className="btn-secondary text-xs">Return to Dashboard</Link>
      </div>
    )
  }

  const isInvoice = doc.type === 'INVOICE'
  const isLoss = doc.netProfit < 0
  const outstanding = doc.totalSellPrice - doc.amountPaid

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={isInvoice ? '/invoices' : '/quotations'}
            className="p-2 border border-[#E5E5E5] hover:bg-[#F8F9FA] transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#111111] tracking-tight">{doc.refNumber}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                doc.status === 'PAID' ? 'bg-green-50 text-green-800 border-green-200' :
                doc.status === 'DELIVERED_PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                doc.status === 'ACCEPTED' ? 'bg-green-50 text-green-800 border-green-200' :
                doc.status === 'ORDER_PRESSED' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                doc.status === 'STOCK_READY' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                {doc.status === 'ORDER_PRESSED' ? 'ORDER PRESSED / AWAITING STOCK' :
                 doc.status === 'STOCK_READY' ? 'STOCK READY — READY TO INVOICE' :
                 doc.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued {format(new Date(doc.issueDate), 'd MMMM yyyy')} to {doc.client.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle View Mode */}
          <div className="flex border border-[#E5E5E5] bg-white">
            <button
              onClick={() => setViewMode('internal')}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'internal' ? 'bg-[#111111] text-white' : 'text-gray-600 hover:text-[#111111]'
              }`}
            >
              <Lock size={12} /> Internal View
            </button>
            <button
              onClick={() => setViewMode('client')}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'client' ? 'bg-[#C62828] text-white' : 'text-gray-600 hover:text-[#111111]'
              }`}
            >
              <ShieldCheck size={12} /> Client PDF Preview
            </button>
          </div>

          {!isInvoice && doc.status !== 'ACCEPTED' && (
            <button
              onClick={() => handleConvert()}
              disabled={submitting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <ArrowRightCircle size={14} />
              Convert to Invoice
            </button>
          )}

          {isInvoice && doc.status !== 'PAID' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <CreditCard size={14} />
              Record Payment
            </button>
          )}

          <button
            onClick={handlePrint}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Printer size={14} />
            Print / PDF
          </button>

          <button
            onClick={handleVoid}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-[#C62828] transition-colors border border-transparent hover:border-red-200"
          >
            Void
          </button>
        </div>
      </div>

      {/* Orders Pressed / Awaiting Stock Notice for Quotations */}
      {doc.status === 'ORDER_PRESSED' && (
        <div className="no-print mb-6 bg-amber-50 border border-amber-300 p-4 rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-700" size={20} />
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Order Pressed / Awaiting Stock
              </p>
              <p className="text-xs text-amber-800">
                One or more items in this quotation exceed available physical stock. Restock via Receive Shipment in Inventory to fulfill, or use Backorder Override when converting to Invoice.
              </p>
            </div>
          </div>
          <Link
            href="/inventory/receive"
            className="text-xs font-bold text-amber-900 border border-amber-400 bg-white px-3 py-1.5 rounded hover:bg-amber-100 whitespace-nowrap"
          >
            Receive Shipment &rarr;
          </Link>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* INTERNAL VIEW MODE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'internal' && (
        <div className="no-print space-y-6">
          {/* Internal P&L Live Banner */}
          <div className={`card border-l-4 ${isLoss ? 'border-l-[#C62828] bg-red-50/20' : 'border-l-green-600 bg-white'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
              <div className="flex items-center gap-2">
                {isLoss ? (
                  <TrendingDown size={18} className="text-[#C62828]" />
                ) : (
                  <TrendingUp size={18} className="text-green-600" />
                )}
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                    Internal Real-Time Profit & Loss Breakdown
                  </h2>
                  <p className="text-[11px] text-gray-500">Confidential internal ledger data — strictly hidden from client documents</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 border tabular-nums ${
                isLoss ? 'bg-red-50 text-[#C62828] border-red-200' : 'bg-green-50 text-green-800 border-green-200'
              }`}>
                {isLoss ? 'LOSS ORDER' : 'PROFITABLE'} ({formatPercent(doc.profitMargin)})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Selling Revenue</p>
                <p className="text-xl font-black text-[#111111] tabular-nums mt-0.5">{formatCurrency(doc.totalSellPrice)}</p>
                <p className="text-[11px] text-gray-400">Sum of (Qty × Sell Price)</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total COGS (Buying)</p>
                <p className="text-xl font-black text-gray-700 tabular-nums mt-0.5">{formatCurrency(doc.totalBuyPrice)}</p>
                <p className="text-[11px] text-gray-400">Sum of (Qty × Buy Price)</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Order Net Profit</p>
                <p className={`text-xl font-black tabular-nums mt-0.5 ${isLoss ? 'text-[#C62828]' : 'text-green-700'}`}>
                  {formatCurrency(doc.netProfit)}
                </p>
                <p className="text-[11px] text-gray-400">Revenue minus COGS</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Profit Margin</p>
                <p className={`text-xl font-black tabular-nums mt-0.5 ${isLoss ? 'text-[#C62828]' : 'text-green-700'}`}>
                  {formatPercent(doc.profitMargin)}
                </p>
                <p className="text-[11px] text-gray-400">Net / Revenue</p>
              </div>
            </div>

            {isLoss && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-[#C62828] mt-0.5 shrink-0" />
                <p className="text-xs text-[#C62828] font-medium leading-relaxed">
                  <strong>Loss Alert:</strong> Total buying costs ({formatCurrency(doc.totalBuyPrice)}) exceed selling price ({formatCurrency(doc.totalSellPrice)}). Review line items below to identify below-cost items or high outsource expenses.
                </p>
              </div>
            )}
          </div>

          {/* Dual-Price Line Items Table */}
          <div className="card p-0">
            <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Line Items (Dual-Price Internal Audit)
              </h3>
              <span className="text-[11px] text-gray-500">{doc.items.length} line items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left">#</th>
                    <th className="table-header text-left">Item Description</th>
                    <th className="table-header text-center">Qty</th>
                    <th className="table-header text-right">Unit Buy (COGS)</th>
                    <th className="table-header text-right">Unit Sell</th>
                    <th className="table-header text-right">Total Cost</th>
                    <th className="table-header text-right">Total Revenue</th>
                    <th className="table-header text-right">Line Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((it, idx) => (
                    <tr key={it.id} className="table-row">
                      <td className="table-cell text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="table-cell">
                        <div className="font-semibold text-xs text-[#111111]">{it.description}</div>
                        {it.notes && (
                          <div className="text-[11px] text-gray-500 italic mt-0.5">{it.notes}</div>
                        )}
                      </td>
                      <td className="table-cell text-center tabular-nums text-xs font-semibold">{it.qty}</td>
                      <td className="table-cell text-right tabular-nums text-xs text-gray-500">{formatCurrency(it.buyingPrice)}</td>
                      <td className="table-cell text-right tabular-nums text-xs font-bold">{formatCurrency(it.sellingPrice)}</td>
                      <td className="table-cell text-right tabular-nums text-xs text-gray-500">{formatCurrency(it.lineCost)}</td>
                      <td className="table-cell text-right tabular-nums text-xs font-semibold">{formatCurrency(it.lineTotal)}</td>
                      <td className={`table-cell text-right tabular-nums text-xs font-bold ${it.lineProfit < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
                        {formatCurrency(it.lineProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Accrual Status Card (For Invoices) */}
          {isInvoice && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-3">
                  Accrual & Payment Tracking
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Billed Revenue:</span>
                    <span className="tabular-nums font-bold text-[#111111]">{formatCurrency(doc.totalSellPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Collected Cash:</span>
                    <span className="tabular-nums font-bold text-green-700">{formatCurrency(doc.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E5E5E5] pt-2">
                    <span className="text-gray-700 font-semibold">Outstanding AR Balance:</span>
                    <span className={`tabular-nums font-black ${outstanding > 0 ? 'text-[#C62828]' : 'text-gray-800'}`}>
                      {formatCurrency(outstanding)}
                    </span>
                  </div>
                  {doc.paidDate && (
                    <div className="flex justify-between text-gray-500 pt-1">
                      <span>Date Settled:</span>
                      <span>{format(new Date(doc.paidDate), 'd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Payment Records
                  </h3>
                  {doc.status !== 'PAID' && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="text-[11px] text-[#C62828] font-bold hover:underline"
                    >
                      + Add Payment
                    </button>
                  )}
                </div>
                {(!doc.payments || doc.payments.length === 0) ? (
                  <p className="text-xs text-gray-400 py-3">No payments recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#E5E5E5]">
                    {doc.payments.map(p => (
                      <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-[#111111]">{p.method.replace('_', ' ')}</div>
                          <div className="text-[10px] text-gray-400">{format(new Date(p.paidAt), 'd MMM yyyy')} {p.notes ? `• ${p.notes}` : ''}</div>
                        </div>
                        <span className="font-bold tabular-nums text-green-700">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CLIENT-FACING PRINT / PDF VIEW (Exact Brand Specs) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`bg-white border border-[#E5E5E5] p-8 lg:p-12 shadow-sm ${viewMode === 'internal' ? 'hidden' : 'block'} print:block print:border-0 print:p-0`}>
        {/* Document Header */}
        <div className="flex items-start justify-between pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#C62828] flex items-center justify-center">
                <span className="text-white text-xs font-black">PM</span>
              </div>
              <h1 className="text-2xl font-black text-[#111111] tracking-wider uppercase">
                PODMYTH
              </h1>
            </div>
            <p className="text-[10px] font-bold text-[#C62828] tracking-widest uppercase mt-1">
              MEDICAL APPAREL & DIAGNOSTIC GEAR
            </p>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-black text-[#C62828] tracking-tight uppercase">
              {doc.type}
            </h2>
            <div className="mt-2 text-xs space-y-1 text-gray-600">
              <div><strong className="text-[#111111]">Ref #:</strong> <span className="font-mono font-bold text-[#111111]">{doc.refNumber}</span></div>
              <div><strong className="text-[#111111]">Date:</strong> {format(new Date(doc.issueDate), 'd MMMM yyyy')}</div>
              {doc.dueDate && (
                <div><strong className="text-[#111111]">Due Date:</strong> {format(new Date(doc.dueDate), 'd MMMM yyyy')}</div>
              )}
            </div>
          </div>
        </div>

        {/* 3px PodMyth Crimson Red Divider */}
        <div className="h-[3px] bg-[#C62828] w-full mb-6" />

        {/* Two-Column Cards: BILLED TO / ISSUED BY */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="card-surface border-l-4 border-l-[#111111] p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">BILLED TO</p>
            <p className="text-sm font-black text-[#111111]">{doc.client.name}</p>
            {doc.client.phone && <p className="text-xs text-gray-600 mt-1">{doc.client.phone}</p>}
            {doc.client.city && (
              <p className="text-xs text-gray-600">
                {doc.client.city}{doc.client.deliveryZone ? ` (${doc.client.deliveryZone})` : ''}
              </p>
            )}
          </div>

          <div className="card-surface border-l-4 border-l-[#C62828] p-4 text-right">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">ISSUED BY</p>
            <p className="text-sm font-black text-[#111111]">PODMYTH</p>
            <p className="text-xs text-gray-600 mt-1">Medical Apparel & Diagnostic Gear</p>
            <p className="text-xs text-gray-600">Harare, Zimbabwe</p>
            <p className="text-xs text-gray-600">sales@podmyth.com</p>
          </div>
        </div>

        {/* Client-Facing Line Items Table (Internal COGS strictly excluded!) */}
        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr>
              <th className="bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 text-left w-12">#</th>
              <th className="bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 text-left">Description</th>
              <th className="bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 text-center w-20">Qty</th>
              <th className="bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 text-right w-32">Unit Price</th>
              <th className="bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 text-right w-36">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, idx) => (
              <tr key={it.id} className="border-b border-[#E5E5E5]">
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{idx + 1}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-semibold text-[#111111]">{it.description}</div>
                  {it.notes && (
                    <div className="text-[11px] text-gray-500 mt-0.5">{it.notes}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-center font-bold tabular-nums">{it.qty}</td>
                <td className="px-4 py-3 text-xs text-right font-medium tabular-nums">{formatCurrency(it.sellingPrice)}</td>
                <td className="px-4 py-3 text-xs text-right font-bold tabular-nums text-[#111111]">{formatCurrency(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Block */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-gray-500 font-medium">Subtotal:</span>
              <span className="tabular-nums font-bold text-[#111111]">{formatCurrency(doc.totalSellPrice)}</span>
            </div>
            {isInvoice && (
              <>
                <div className="flex justify-between py-1 border-t border-[#E5E5E5]">
                  <span className="text-gray-500 font-medium">Amount Paid:</span>
                  <span className="tabular-nums font-bold text-green-700">-{formatCurrency(doc.amountPaid)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-[#111111] text-sm">
                  <span className="font-black text-[#111111]">Balance Due:</span>
                  <span className="tabular-nums font-black text-[#C62828]">{formatCurrency(outstanding)}</span>
                </div>
              </>
            )}
            {!isInvoice && (
              <div className="flex justify-between py-2 border-t-2 border-[#111111] text-sm">
                <span className="font-black text-[#111111]">Total:</span>
                <span className="tabular-nums font-black text-[#111111]">{formatCurrency(doc.totalSellPrice)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mandatory Default Terms Box */}
        <div className="border border-[#E5E5E5] border-l-4 border-l-[#C62828] p-4 bg-[#F8F9FA]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">TERMS & CONDITIONS</p>
          <p className="text-xs text-[#111111] font-medium leading-relaxed">
            {doc.terms}
          </p>
          {doc.notes && (
            <p className="text-xs text-gray-600 mt-2 italic">Note: {doc.notes}</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#E5E5E5] flex justify-between text-[10px] text-gray-400 uppercase tracking-wider">
          <span>PodMyth Finance System • Official Client Copy</span>
          <span>Thank you for choosing PodMyth</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* RECORD PAYMENT MODAL */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full border border-[#111111] p-6 shadow-2xl">
            <h3 className="text-base font-black text-[#111111] tracking-tight mb-4">
              Record Client Payment
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Invoice Ref: <strong>{doc.refNumber}</strong> • Outstanding: <strong className="text-[#C62828]">{formatCurrency(outstanding)}</strong>
            </p>

            <form onSubmit={handlePayment} className="space-y-4 text-xs">
              <div>
                <label className="label">Amount Received (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input font-bold tabular-nums"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Payment Method *</label>
                <select
                  className="select"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                >
                  <option value="USD_CASH">USD Cash</option>
                  <option value="ECOCASH">EcoCash</option>
                  <option value="INNBUCKS">InnBucks</option>
                  <option value="BANK_NOSTRO">Bank / Nostro Transfer</option>
                </select>
              </div>

              <div>
                <label className="label">Payment Date</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Reference / Notes</label>
                <input
                  className="input"
                  placeholder="e.g. EcoCash ref or notes..."
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
