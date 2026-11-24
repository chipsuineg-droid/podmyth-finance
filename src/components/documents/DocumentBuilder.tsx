'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, calcOrderTotals } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import { Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown, Search, X, CreditCard, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Variant {
  id: string; sku: string; color: string; size: string; stockQty: number
  defaultBuyPrice: number; defaultSellPrice: number
  product: { id: string; name: string; isService: boolean; category: { name: string } }
}

interface Client { id: string; name: string; phone?: string; city?: string }

interface LineItem {
  tempId: string
  variantId: string | null
  productName: string
  color: string
  size: string
  description: string
  notes: string
  qty: number
  buyingPrice: number
  sellingPrice: number
}

interface NewClientForm {
  name: string
  phone: string
  email: string
  city: string
  deliveryZone: string
  notes: string
}

function newItem(): LineItem {
  return {
    tempId: Math.random().toString(36).slice(2),
    variantId: null,
    productName: '',
    color: '',
    size: '',
    description: '',
    notes: '',
    qty: 1,
    buyingPrice: 0,
    sellingPrice: 0,
  }
}

function DocumentBuilderInner({ type }: { type: 'QUOTATION' | 'INVOICE' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([newItem()])
  const [saving, setSaving] = useState(false)
  const [allowBackorder, setAllowBackorder] = useState(false)
  const [isPaid, setIsPaid] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'USD_CASH' | 'ECOCASH' | 'INNBUCKS' | 'BANK_NOSTRO'>('USD_CASH')
  const [amountPaidInput, setAmountPaidInput] = useState('')
  const [variantSearch, setVariantSearch] = useState<Record<string, string>>({})
  const [variantResults, setVariantResults] = useState<Record<string, Variant[]>>({})
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({})

  // New client modal state
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState<NewClientForm>({
    name: '', phone: '', email: '', city: '', deliveryZone: '', notes: ''
  })
  const [savingNewClient, setSavingNewClient] = useState(false)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(j => setClients(j.data ?? []))
  }, [])

  // Pre-select client from URL param once clients are loaded
  useEffect(() => {
    const preselected = searchParams.get('clientId')
    if (preselected && clients.some(c => c.id === preselected)) {
      setClientId(preselected)
    }
  }, [clients, searchParams])

  const searchVariants = useCallback(async (tempId: string, q: string) => {
    if (!q || q.length < 2) { setVariantResults(prev => ({ ...prev, [tempId]: [] })); return }
    const res = await fetch(`/api/variants?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    const results = (json.data ?? []).map((v: any) => ({
      ...v,
      defaultBuyPrice: Number(v.defaultBuyPrice),
      defaultSellPrice: Number(v.defaultSellPrice),
    }))
    setVariantResults(prev => ({ ...prev, [tempId]: results }))
    setShowDropdown(prev => ({ ...prev, [tempId]: true }))
  }, [])

  const selectVariant = (tempId: string, variant: Variant) => {
    const prodName = variant.product.name
    const col = variant.color !== 'N/A' ? variant.color : ''
    const sz = variant.size !== 'N/A' ? variant.size : ''
    const formattedDesc = `${prodName}${col ? ` - ${col}` : ''}${sz ? ` (${sz})` : ''}`

    setItems(prev => prev.map(it => it.tempId === tempId ? {
      ...it,
      variantId: variant.id,
      productName: prodName,
      color: col,
      size: sz,
      description: formattedDesc,
      buyingPrice: variant.defaultBuyPrice,
      sellingPrice: variant.defaultSellPrice,
    } : it))
    setVariantSearch(prev => ({ ...prev, [tempId]: '' }))
    setShowDropdown(prev => ({ ...prev, [tempId]: false }))
  }

  const updateItem = (tempId: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(it => {
      if (it.tempId !== tempId) return it
      const updated = { ...it, [field]: value }

      if (field === 'productName' || field === 'color' || field === 'size') {
        const pName = field === 'productName' ? value : it.productName
        const col = field === 'color' ? value : it.color
        const sz = field === 'size' ? value : it.size
        updated.description = `${(pName || '').trim()}${col ? ` - ${col.trim()}` : ''}${sz ? ` (${sz.trim()})` : ''}`
      }
      return updated
    }))
  }

  const removeItem = (tempId: string) => setItems(prev => prev.filter(it => it.tempId !== tempId))
  const addItem = () => setItems(prev => [...prev, newItem()])

  const totals = calcOrderTotals(items.map(it => ({ ...it, buyingPrice: Number(it.buyingPrice), sellingPrice: Number(it.sellingPrice) })))
  const isLoss = totals.netProfit < 0

  const handleSubmit = async () => {
    if (!clientId) { toast('Please select a client', 'error'); return }
    if (items.some(it => !it.description.trim() && !it.productName.trim())) {
      toast('All items need a product name or description', 'error')
      return
    }

    setSaving(true)
    try {
      const parsedAmount = parseFloat(amountPaidInput)
      const paidVal = isPaid ? (isNaN(parsedAmount) ? totals.totalSellPrice : parsedAmount) : 0

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, clientId, issueDate, notes,
          allowBackorder,
          isPaid: type === 'INVOICE' ? isPaid : false,
          paymentMethod: type === 'INVOICE' && isPaid ? paymentMethod : undefined,
          amountPaid: type === 'INVOICE' ? paidVal : 0,
          items: items.map(it => {
            const pName = (it.productName || it.description || '').trim()
            const col = (it.color || '').trim()
            const sz = (it.size || '').trim()
            const finalDesc = `${pName}${col ? ` - ${col}` : ''}${sz ? ` (${sz})` : ''}`

            const tags = [
              col ? `Color: ${col}` : '',
              sz ? `Size: ${sz}` : ''
            ].filter(Boolean).join(' | ')

            const combinedNotes = (it.notes || '').trim()
              ? (tags ? `${tags} • ${(it.notes || '').trim()}` : (it.notes || '').trim())
              : (tags || undefined)

            return {
              variantId: it.variantId || null,
              description: finalDesc,
              notes: combinedNotes,
              qty: Number(it.qty),
              buyingPrice: Number(it.buyingPrice),
              sellingPrice: Number(it.sellingPrice),
            }
          })
        })
      })
      const json = await res.json()
      if (!res.ok) { toast(json.error ?? 'Failed to save', 'error'); return }
      toast(`${type === 'INVOICE' ? 'Invoice' : 'Quotation'} created successfully!`)
      router.push(type === 'INVOICE' ? `/invoices/${json.data.id}` : `/quotations/${json.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim()) {
      toast('Client name is required', 'error')
      return
    }
    setSavingNewClient(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientForm),
      })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error ?? 'Failed to create client', 'error')
        return
      }
      const created: Client = json.data
      setClients(prev => [...prev, created])
      setClientId(created.id)
      setShowNewClientModal(false)
      setNewClientForm({ name: '', phone: '', email: '', city: '', deliveryZone: '', notes: '' })
      toast('Client created and selected')
    } finally {
      setSavingNewClient(false)
    }
  }

  const label = type === 'INVOICE' ? 'Invoice' : 'Quotation'

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">New {label}</h1>
        <p className="text-sm text-gray-500 mt-1">Build a new {label.toLowerCase()} for PodMyth</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Details */}
          <div className="card">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4">Document Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Client *</label>
                <select className="select" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` - ${c.city}` : ''}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setNewClientForm({ name: '', phone: '', email: '', city: '', deliveryZone: '', notes: '' })
                    setShowNewClientModal(true)
                  }}
                  className="mt-1.5 text-xs text-[#C62828] hover:underline font-semibold"
                >
                  + Add new client
                </button>
              </div>
              <div>
                <label className="label">Issue Date</label>
                <input type="date" className="input" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Notes (Internal)</label>
                <input className="input" placeholder="Optional internal notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card p-0">
            <div className="px-5 py-4 border-b border-[#E5E5E5]">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider">Line Items</h2>
            </div>
            <div className="divide-y divide-[#E5E5E5]">
              {items.map((item, idx) => (
                <div key={item.tempId} className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-400 w-6 mt-2.5">{idx + 1}</span>
                    <div className="flex-1 relative">
                      {/* Variant Search */}
                      <div className="relative mb-2">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="input pl-8 text-xs"
                          placeholder="Search product/SKU to auto-fill..."
                          value={variantSearch[item.tempId] ?? ''}
                          onChange={e => {
                            const val = e.target.value
                            setVariantSearch(prev => ({ ...prev, [item.tempId]: val }))
                            searchVariants(item.tempId, val)
                          }}
                          onFocus={() => setShowDropdown(prev => ({ ...prev, [item.tempId]: true }))}
                        />
                        {showDropdown[item.tempId] && (variantResults[item.tempId] ?? []).length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-[#E5E5E5] shadow-lg z-20 max-h-56 overflow-y-auto">
                            {(variantResults[item.tempId] ?? []).map(v => (
                              <button
                                key={v.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-[#F8F9FA] text-xs border-b border-[#E5E5E5] last:border-0"
                                onClick={() => selectVariant(item.tempId, v)}
                              >
                                <div className="font-semibold text-[#111111]">{v.product.name}</div>
                                <div className="text-gray-500 flex gap-3 mt-0.5">
                                  {v.color !== 'N/A' && <span>{v.color}</span>}
                                  {v.size !== 'N/A' && <span>Size: {v.size}</span>}
                                  {!v.product.isService && <span className={v.stockQty <= 2 ? 'text-[#C62828] font-bold' : 'text-green-700'}>Stock: {v.stockQty}</span>}
                                  <span>Sell: {formatCurrency(v.defaultSellPrice)}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {/* Product Name */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Product Name *
                          </label>
                          <input
                            className="input text-sm"
                            placeholder="e.g. TANC Core Scrub Set, Diagnostic Stethoscope..."
                            value={item.productName || item.description}
                            onChange={e => updateItem(item.tempId, 'productName', e.target.value)}
                          />
                        </div>

                        {/* Dedicated spaces for Color, Size, and Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                              Color
                            </label>
                            <input
                              className="input text-xs"
                              placeholder="e.g. Petrol, Navy, Charcoal..."
                              value={item.color}
                              onChange={e => updateItem(item.tempId, 'color', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                              Size
                            </label>
                            <input
                              className="input text-xs"
                              placeholder="e.g. XS, S, M, L, XL, 2XL..."
                              value={item.size}
                              onChange={e => updateItem(item.tempId, 'size', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                              Embroidery / Notes
                            </label>
                            <input
                              className="input text-xs text-gray-600"
                              placeholder='e.g. Chest: "Dr. Matiashe"'
                              value={item.notes}
                              onChange={e => updateItem(item.tempId, 'notes', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Preview description tag */}
                        {(item.color || item.size) && (
                          <div className="text-[11px] text-gray-500 bg-[#F8F9FA] px-2 py-1 border border-[#E5E5E5] flex items-center justify-between">
                            <span>Quotation Label: <strong>{(item.productName || item.description || 'Product')}{item.color ? ` - ${item.color}` : ''}{item.size ? ` (${item.size})` : ''}</strong></span>
                            <span className="text-[10px] text-[#C62828] font-bold">Standardized for TANC Order List</span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="label text-[10px]">Qty</label>
                            <input type="number" min={1} className="input text-sm tabular-nums" value={item.qty}
                              onChange={e => updateItem(item.tempId, 'qty', parseInt(e.target.value) || 1)} />
                          </div>
                          <div>
                            <label className="label text-[10px] text-gray-500">Buy Price (Internal)</label>
                            <input type="number" min={0} step="0.01" className="input text-sm tabular-nums text-gray-600"
                              value={item.buyingPrice}
                              onChange={e => updateItem(item.tempId, 'buyingPrice', parseFloat(e.target.value) || 0)} />
                          </div>
                          <div>
                            <label className="label text-[10px]">Sell Price</label>
                            <input type="number" min={0} step="0.01" className="input text-sm tabular-nums font-semibold"
                              value={item.sellingPrice}
                              onChange={e => updateItem(item.tempId, 'sellingPrice', parseFloat(e.target.value) || 0)} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItem(item.tempId)}
                      className="mt-2 p-1.5 text-gray-400 hover:text-[#C62828] transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="ml-8 flex items-center gap-4 text-xs text-gray-500">
                    <span>Subtotal: <span className="font-semibold tabular-nums text-[#111111]">{formatCurrency(item.qty * item.sellingPrice)}</span></span>
                    <span>Cost: <span className="tabular-nums">{formatCurrency(item.qty * item.buyingPrice)}</span></span>
                    <span className={`font-semibold tabular-nums ${(item.qty * item.sellingPrice - item.qty * item.buyingPrice) < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
                      Line Profit: {formatCurrency(item.qty * item.sellingPrice - item.qty * item.buyingPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#E5E5E5]">
              <button type="button" onClick={addItem}
                className="flex items-center gap-2 text-sm text-[#111111] hover:text-[#C62828] font-semibold transition-colors">
                <Plus size={15} /> Add Line Item
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: P&L Summary */}
        <div className="space-y-4">
          {/* Internal P&L */}
          <div className={`card border-l-4 ${isLoss ? 'border-l-[#C62828]' : 'border-l-green-500'}`}>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              {isLoss ? <TrendingDown size={14} className="text-[#C62828]" /> : <TrendingUp size={14} className="text-green-600" />}
              Internal P&L (Private)
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue</span>
                <span className="tabular-nums font-semibold">{formatCurrency(totals.totalSellPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total COGS</span>
                <span className="tabular-nums text-gray-500">-{formatCurrency(totals.totalBuyPrice)}</span>
              </div>
              <div className="border-t border-[#E5E5E5] pt-2 flex justify-between font-bold">
                <span>Net Profit</span>
                <span className={`tabular-nums ${isLoss ? 'text-[#C62828]' : 'text-green-700'}`}>{formatCurrency(totals.netProfit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Margin</span>
                <span className={`tabular-nums font-semibold ${isLoss ? 'text-[#C62828]' : 'text-green-700'}`}>{totals.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
            {isLoss && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 p-2.5">
                <AlertTriangle size={14} className="text-[#C62828] mt-0.5 shrink-0" />
                <p className="text-xs text-[#C62828] font-semibold">Warning: This order is running at a loss. Selling prices are below buying costs.</p>
              </div>
            )}
          </div>

          {/* Client Total */}
          <div className="card">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3">Client Facing Total</h2>
            <div className="text-3xl font-black tabular-nums text-[#111111]">{formatCurrency(totals.totalSellPrice)}</div>
            <p className="text-xs text-gray-500 mt-1">Amount shown on {label.toLowerCase()}</p>
          </div>

          {/* Payment Status (Invoices Only) */}
          {type === 'INVOICE' && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#C62828]" />
                  Settlement Standpoint
                </h2>
                <span className="text-[10px] font-mono text-gray-400">FINANCE</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaid(true)
                    setAmountPaidInput(totals.totalSellPrice.toString())
                  }}
                  className={`py-2 px-3 text-xs font-bold border text-center transition-colors ${
                    isPaid
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-gray-700 border-[#E5E5E5] hover:bg-gray-50'
                  }`}
                >
                  Paid Now (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaid(false)
                    setAmountPaidInput('0')
                  }}
                  className={`py-2 px-3 text-xs font-bold border text-center transition-colors ${
                    !isPaid
                      ? 'bg-[#C62828] text-white border-[#C62828]'
                      : 'bg-white text-gray-700 border-[#E5E5E5] hover:bg-gray-50'
                  }`}
                >
                  ⏳ Pending / Credit
                </button>
              </div>

              {isPaid ? (
                <div className="space-y-2.5 pt-2 border-t border-[#E5E5E5]">
                  <div>
                    <label className="label">Deposit Method</label>
                    <select
                      className="select text-xs"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                    >
                      <option value="USD_CASH">USD Cash (Liquid Physical Cash)</option>
                      <option value="ECOCASH">EcoCash</option>
                      <option value="INNBUCKS">InnBucks</option>
                      <option value="BANK_NOSTRO">Bank Nostro</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Amount Paid ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-xs"
                      placeholder={totals.totalSellPrice.toString()}
                      value={amountPaidInput}
                      onChange={e => setAmountPaidInput(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-green-700 font-medium">
                    Physical cash in hand will immediately update by {formatCurrency(parseFloat(amountPaidInput) || totals.totalSellPrice)}.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 pt-1 border-t border-[#E5E5E5]">
                  Will be logged as Pending Receivables ({formatCurrency(totals.totalSellPrice)}) until settlement is collected.
                </p>
              )}
            </div>
          )}

          {/* Backorder Toggle (invoices only) */}
          {type === 'INVOICE' && (
            <div className="card">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-10 h-5 relative cursor-pointer ${allowBackorder ? 'bg-[#111111]' : 'bg-[#E5E5E5]'} transition-colors`}
                  onClick={() => setAllowBackorder(!allowBackorder)}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${allowBackorder ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-xs font-semibold">Allow Backorder (oversell)</span>
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary w-full py-3 text-sm font-bold"
          >
            {saving ? 'Creating...' : `Create ${label}`}
          </button>
          <p className="text-xs text-gray-400 text-center">Internal buying prices are never shown on client PDFs.</p>
        </div>
      </div>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full border border-[#111111] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowNewClientModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#111111] transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#111111] mb-5">Add New Client</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input
                  className="input"
                  value={newClientForm.name}
                  onChange={e => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={newClientForm.phone}
                  onChange={e => setNewClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={newClientForm.email}
                  onChange={e => setNewClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input
                    className="input"
                    value={newClientForm.city}
                    onChange={e => setNewClientForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="label">Delivery Zone</label>
                  <input
                    className="input"
                    value={newClientForm.deliveryZone}
                    onChange={e => setNewClientForm(prev => ({ ...prev, deliveryZone: e.target.value }))}
                    placeholder="Zone"
                  />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={newClientForm.notes}
                  onChange={e => setNewClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreateClient}
                disabled={savingNewClient}
                className="btn-primary flex-1"
              >
                {savingNewClient ? 'Creating...' : 'Create Client'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DocumentBuilder({ type }: { type: 'QUOTATION' | 'INVOICE' }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading...</div>}>
      <DocumentBuilderInner type={type} />
    </Suspense>
  )
}
