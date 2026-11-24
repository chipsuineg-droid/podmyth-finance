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
  ArrowLeft, CreditCard, ShieldCheck, Lock, Download, Share2, Loader2
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
  const [downloading, setDownloading] = useState(false)
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

  const handleDownload = async () => {
    if (!doc) return
    try {
      setDownloading(true)
      toast('Generating PDF...', 'info')
      if (viewMode !== 'client') {
        setViewMode('client')
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      const el = document.getElementById('printable-document')
      if (!el) {
        toast('Document view not ready', 'error')
        return
      }
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297))
      pdf.save(`${doc.refNumber}.pdf`)
      toast('PDF downloaded successfully!', 'success')
    } catch (err: any) {
      console.error(err)
      toast('Failed to download PDF', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!doc) return
    try {
      setDownloading(true)
      toast('Preparing PDF to share...', 'info')
      if (viewMode !== 'client') {
        setViewMode('client')
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      const el = document.getElementById('printable-document')
      if (!el) {
        toast('Document view not ready', 'error')
        return
      }
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297))
      const blob = pdf.output('blob')
      const fileName = `${doc.refNumber}.pdf`
      const file = new File([blob], fileName, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${doc.refNumber} - PodMyth Group`,
          text: `PodMyth Group ${isInvoice ? 'Invoice' : 'Quotation'} for ${doc.client.name}`,
        })
      } else if (navigator.share) {
        await navigator.share({
          title: `${doc.refNumber} - PodMyth Group`,
          url: window.location.href,
        })
      } else {
        pdf.save(fileName)
        toast('Shared via download', 'success')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err)
        toast('Unable to share document', 'error')
      }
    } finally {
      setDownloading(false)
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
                doc.status === 'PAID' ? 'bg-[#111111] text-white border-[#111111]' :
                doc.status === 'DELIVERED_PENDING' ? 'bg-white text-[#C62828] border-[#C62828]' :
                doc.status === 'ACCEPTED' ? 'bg-[#111111] text-white border-[#111111]' :
                doc.status === 'ORDER_PRESSED' ? 'bg-white text-[#C62828] border-[#C62828]' :
                doc.status === 'STOCK_READY' ? 'bg-[#111111] text-white border-[#111111]' :
                'bg-white text-[#111111] border-[#E5E5E5]'
              }`}>
                {doc.status === 'ORDER_PRESSED' ? 'ORDER PRESSED: AWAITING STOCK' :
                 doc.status === 'STOCK_READY' ? 'STOCK READY: READY TO INVOICE' :
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
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary text-xs flex items-center gap-1.5"
            title="Download PDF directly to your device"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>

          <button
            onClick={handleShare}
            disabled={downloading}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Share document to WhatsApp, email or other apps"
          >
            <Share2 size={14} />
            Share
          </button>

          <button
            onClick={handlePrint}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Open print preview"
          >
            <Printer size={14} />
            Print
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
        <div className="no-print mb-6 card border-l-4 border-l-[#C62828] p-4 flex items-center justify-between bg-white">
          <div>
            <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Order Pressed: Awaiting Stock
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              One or more items in this quotation exceed available physical stock. Restock via Receive Shipment in Inventory to fulfill, or confirm Backorder Override when converting to Invoice.
            </p>
          </div>
          <Link
            href="/inventory/receive"
            className="btn-secondary text-xs font-bold whitespace-nowrap"
          >
            Receive Stock &rarr;
          </Link>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* INTERNAL VIEW MODE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'internal' && (
        <div className="no-print space-y-6">
          {/* Internal P&L Live Banner */}
          <div className={`card border-l-4 ${isLoss ? 'border-l-[#C62828] bg-white' : 'border-l-[#111111] bg-white'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
              <div className="flex items-center gap-2">
                {isLoss ? (
                  <TrendingDown size={18} className="text-[#C62828]" />
                ) : (
                  <TrendingUp size={18} className="text-[#111111]" />
                )}
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                    Internal Real-Time Profit & Loss Breakdown
                  </h2>
                  <p className="text-[11px] text-gray-500">Confidential internal ledger data - strictly hidden from client documents</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 border tabular-nums ${
                isLoss ? 'bg-white text-[#C62828] border-[#C62828]' : 'bg-[#111111] text-white border-[#111111]'
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
      <div
        id="printable-document"
        className={`bg-white border border-[#E5E5E5] p-10 lg:p-12 shadow-sm ${
          viewMode === 'internal' ? 'hidden' : 'flex'
        } flex-col justify-between min-h-[1050px] print:flex print:border-0 print:p-0 print:min-h-0 print:h-[297mm]`}
        style={{ fontFamily: "'Helvetica Neue', Inter, sans-serif" }}
      >
        <div className="flex-1 flex flex-col justify-start">
          {/* SECTION 1 — Header */}
          <div className="flex items-start justify-between">
            {/* Left: Brand */}
            <div>
              <div className="text-[28px] font-black tracking-wider leading-none">
                <span className="text-[#111111]">POD</span><span className="text-[#C62828]">MYTH</span><span className="text-[#111111]"> GROUP</span>
              </div>
              <p className="text-[10px] font-black tracking-[3px] text-[#C62828] uppercase mt-1">
                PODMERCH SUBSIDIARY
              </p>
              <div className="mt-3 space-y-0.5">
                <p className="text-[10px] text-[#555555]">Call: +263 784 881 010</p>
                <p className="text-[10px] text-[#555555]">Email: sales@podmyth.co.zw</p>
                <p className="text-[10px] text-[#555555]">Web: www.podmyth.co.zw</p>
              </div>
            </div>

            {/* Right: Document metadata */}
            <div className="text-right">
              <h2 className="text-[22px] font-black text-[#111111] tracking-[4.5px] uppercase">
                {isInvoice ? 'INVOICE' : 'QUOTATION'}
              </h2>
              <div className="w-[38px] h-[2px] bg-[#C62828] ml-auto mt-1" />
              <div className="mt-3 space-y-1">
                <div className="text-[11px] text-[#555555]">
                  {isInvoice ? 'Invoice No.' : 'Quotation No.'}{' '}
                  <span className="font-mono font-bold text-[#111111]">{doc.refNumber}</span>
                </div>
                <div className="text-[11px] text-[#555555]">
                  Date: <span className="font-bold text-[#111111]">{format(new Date(doc.issueDate), 'd MMMM yyyy')}</span>
                </div>
                <div className="text-[11px] text-[#555555]">
                  {isInvoice ? 'Currency: USD ($)' : 'Valid For: 14 Days'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 — Hairline divider */}
          <div className="h-px bg-[#E2E2E2] my-6" />

          {/* SECTION 3 — Billed To / Prepared For */}
          <div className="mb-6">
            <p className="text-[10px] font-black text-[#C62828] tracking-[2px] uppercase mb-2">
              {isInvoice ? 'BILLED TO' : 'PREPARED FOR'}
            </p>
            <p className="text-[14px] font-black text-[#111111]">{doc.client.name}</p>
            {doc.client.phone && (
              <p className="text-[11px] text-[#555555] mt-0.5">{doc.client.phone}</p>
            )}
            {doc.client.city && (
              <p className="text-[11px] text-[#555555]">
                {doc.client.city}{doc.client.deliveryZone ? `, ${doc.client.deliveryZone}` : ''}
              </p>
            )}
          </div>

          {/* SECTION 4 — Line Items Table */}
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderTop: '1.5px solid #111111', borderBottom: '1.5px solid #111111' }}>
                <th className="bg-white text-[#111111] text-[11px] font-black uppercase tracking-wider py-2.5 text-left" style={{ width: '40px', whiteSpace: 'nowrap' }}>#</th>
                <th className="bg-white text-[#111111] text-[11px] font-black uppercase tracking-wider py-2.5 px-2 text-left" style={{ whiteSpace: 'nowrap' }}>DESCRIPTION</th>
                <th className="bg-white text-[#111111] text-[11px] font-black uppercase tracking-wider py-2.5 text-center" style={{ width: '64px', whiteSpace: 'nowrap' }}>QTY</th>
                <th className="bg-white text-[#111111] text-[11px] font-black uppercase tracking-wider py-2.5 text-right" style={{ width: '112px', whiteSpace: 'nowrap' }}>UNIT PRICE</th>
                <th className="bg-white text-[#111111] text-[11px] font-black uppercase tracking-wider py-2.5 text-right" style={{ width: '128px', whiteSpace: 'nowrap' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it, idx) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
                  <td className="py-3 text-[12px] text-[#111111] font-mono tabular-nums">{idx + 1}</td>
                  <td className="py-3 px-2 text-[12px] text-[#111111]">
                    <div className="font-semibold">{it.description}</div>
                    {it.notes && (
                      <div className="text-[11px] text-[#555555] mt-0.5">{it.notes}</div>
                    )}
                  </td>
                  <td className="py-3 text-[12px] text-[#111111] text-center font-bold tabular-nums">{it.qty}</td>
                  <td className="py-3 text-[12px] text-[#111111] text-right tabular-nums">{formatCurrency(it.sellingPrice)}</td>
                  <td className="py-3 text-[12px] text-[#111111] text-right font-bold tabular-nums">{formatCurrency(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* SECTION 5 — EcoCash + Totals Split */}
          <div className="flex mt-6 gap-6">
            {/* Left 58%: EcoCash instructions */}
            <div className="pl-4" style={{ width: '58%', borderLeft: '2px solid #C62828' }}>
              <p className="text-[10px] font-black text-[#111111] tracking-wider uppercase mb-2">
                ECOCASH PAYMENT INSTRUCTIONS
              </p>
              <p className="text-[11px] text-[#555555] leading-relaxed mb-3">
                For Ecocash Payments please kindly use this code and send the proof of payment.
              </p>
              <span className="font-mono text-[13px] font-bold text-[#111111] bg-[#F5F5F5] px-3 py-1.5 inline-block mb-2">
                *153*2*2*028776*Amount#
              </span>
              <p className="text-[12px] font-black text-[#111111]">PodMyth Group</p>
            </div>

            {/* Right 42%: Totals */}
            <div className="pl-6" style={{ width: '42%' }}>
              <div className="flex justify-between text-[12px] py-1 mb-1">
                <span className="text-[#555555]">Subtotal</span>
                <span className="font-bold text-[#111111] tabular-nums">{formatCurrency(doc.totalSellPrice)}</span>
              </div>
              <div className="flex justify-between text-[12px] py-1 mb-3">
                <span className="text-[#555555]">Delivery</span>
                <span className="font-bold text-[#111111]">Included</span>
              </div>
              <div style={{ borderTop: '1.5px solid #111111', borderBottom: '1.5px solid #111111' }} className="py-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[14px] font-black text-[#111111]">
                    {isInvoice ? 'Total Due' : 'Quoted Total'}
                  </span>
                  <span className="text-[14px] font-black text-[#C62828] tabular-nums">
                    {formatCurrency(doc.totalSellPrice)}
                  </span>
                </div>
              </div>
              {isInvoice && doc.amountPaid > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#555555]">Amount Paid</span>
                    <span className="text-[#111111] font-bold tabular-nums">-{formatCurrency(doc.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="font-black text-[#111111]">Balance Due</span>
                    <span className="font-black text-[#C62828] tabular-nums">{formatCurrency(outstanding)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6 — Terms & Policies Strip */}
          <div className="mt-6 py-4 px-5 bg-[#FAFAFA]" style={{ borderTop: '1px solid #E2E2E2', borderBottom: '1px solid #E2E2E2' }}>
            <p className="text-[10px] font-black text-[#111111] tracking-wider uppercase mb-2">TERMS & POLICIES</p>
            <p className="text-[10px] font-bold text-[#111111]">Payment Terms:</p>
            <p className="text-[11px] text-[#555555] leading-relaxed" style={{ textAlign: 'justify' }}>
              We accept payments after delivery of service, but sometimes a deposit may be required before processing of your order.
            </p>
            <p className="text-[10px] font-bold text-[#111111] mt-2">Return Policy:</p>
            <p className="text-[11px] text-[#555555] leading-relaxed" style={{ textAlign: 'justify' }}>
              Please make sure you order and verify quotations before your order is confirmed.
            </p>
            {doc.notes && (
              <p className="text-[11px] text-[#555555] mt-2 italic">{doc.notes}</p>
            )}
          </div>
        </div>

        {/* SECTION 7 — Corporate Footer (Anchored to bottom of A4) */}
        <div className="mt-8 pt-4 flex justify-between items-start" style={{ borderTop: '1.5px solid #111111' }}>
          {/* Left: company info */}
          <div>
            <p className="text-[10px] font-black text-[#111111] uppercase tracking-wider">
              PODMYTH GROUP • PodMerch Subsidiary
            </p>
            <p className="text-[10px] text-[#555555] mt-1">
              Call: +263 784 881 010 • sales@podmyth.co.zw • www.podmyth.co.zw
            </p>
          </div>

          {/* Right: Social icons */}
          <div className="flex items-center gap-3">
            {/* Facebook */}
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#111111" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              <span className="text-[10px] text-[#555555]">PodMyth</span>
            </div>
            {/* Instagram */}
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="#111111" stroke="none"/>
              </svg>
              <span className="text-[10px] text-[#555555]">@podmyth</span>
            </div>
            {/* YouTube */}
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#C62828" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
              </svg>
              <span className="text-[10px] text-[#555555]">PodMyth</span>
            </div>
            {/* Website */}
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-[10px] text-[#555555]">www.podmyth.co.zw</span>
            </div>
          </div>
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
