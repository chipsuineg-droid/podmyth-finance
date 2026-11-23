'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import {
  ArrowDownToLine, Upload, Plus, Trash2, ArrowLeft,
  FileSpreadsheet, Download, CheckCircle, Search
} from 'lucide-react'

interface VariantOption {
  id: string
  sku: string
  color: string
  size: string
  stockQty: number
  defaultBuyPrice: number
  defaultSellPrice: number
  product: {
    id: string
    name: string
    isService: boolean
  }
}

interface BatchRow {
  tempId: string
  variantId: string
  productName: string
  color: string
  size: string
  qty: number
  buyingPrice: number
  sellingPrice: number
  supplier: string
  notes: string
}

export default function ReceiveStockPage() {
  const router = useRouter()
  const [variants, setVariants] = useState<VariantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'single' | 'batch' | 'csv'>('batch')

  // Single Item State
  const [singleVariantId, setSingleVariantId] = useState('')
  const [singleQty, setSingleQty] = useState(10)
  const [singleBuyPrice, setSingleBuyPrice] = useState(20)
  const [singleSellPrice, setSingleSellPrice] = useState(30)
  const [singleSupplier, setSingleSupplier] = useState('Local Apparel Factory')
  const [singleNotes, setSingleNotes] = useState('New shipment restock')
  const [singleSubmitting, setSingleSubmitting] = useState(false)

  // Batch Rows State
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    {
      tempId: 'row-1',
      variantId: '',
      productName: '',
      color: '',
      size: '',
      qty: 5,
      buyingPrice: 20,
      sellingPrice: 30,
      supplier: 'Factory Batch',
      notes: 'Weekly shipment',
    },
  ])
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  // CSV Import State
  const [csvText, setCsvText] = useState('')
  const [csvSubmitting, setCsvSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/variants')
      .then(r => r.json())
      .then(json => {
        const physicalOnly = (json.data ?? [])
          .filter((v: any) => !v.product.isService)
          .map((v: any) => ({
            ...v,
            defaultBuyPrice: Number(v.defaultBuyPrice),
            defaultSellPrice: Number(v.defaultSellPrice),
          }))
        setVariants(physicalOnly)
        if (physicalOnly.length > 0) {
          setSingleVariantId(physicalOnly[0].id)
          setSingleBuyPrice(physicalOnly[0].defaultBuyPrice)
          setSingleSellPrice(physicalOnly[0].defaultSellPrice)
        }
        setLoading(false)
      })
  }, [])

  const handleSelectSingle = (id: string) => {
    setSingleVariantId(id)
    const v = variants.find(x => x.id === id)
    if (v) {
      setSingleBuyPrice(v.defaultBuyPrice)
      setSingleSellPrice(v.defaultSellPrice)
    }
  }

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!singleVariantId) {
      toast('Please choose a variant', 'error')
      return
    }
    setSingleSubmitting(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: singleVariantId,
          qty: Number(singleQty),
          buyingPrice: Number(singleBuyPrice),
          sellingPrice: Number(singleSellPrice),
          supplier: singleSupplier,
          notes: singleNotes,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Failed to receive stock', 'error')
        return
      }
      toast('Stock received and movement logged!', 'success')
      router.push('/inventory')
    } finally {
      setSingleSubmitting(false)
    }
  }

  const addBatchRow = () => {
    setBatchRows(prev => [
      ...prev,
      {
        tempId: `row-${Math.random()}`,
        variantId: '',
        productName: '',
        color: '',
        size: '',
        qty: 5,
        buyingPrice: 20,
        sellingPrice: 30,
        supplier: 'Factory Batch',
        notes: '',
      },
    ])
  }

  const removeBatchRow = (tempId: string) => {
    setBatchRows(prev => prev.filter(r => r.tempId !== tempId))
  }

  const updateBatchRow = (tempId: string, field: keyof BatchRow, val: any) => {
    setBatchRows(prev =>
      prev.map(r => {
        if (r.tempId !== tempId) return r
        const updated = { ...r, [field]: val }
        if (field === 'variantId') {
          const matched = variants.find(v => v.id === val)
          if (matched) {
            updated.buyingPrice = matched.defaultBuyPrice
            updated.sellingPrice = matched.defaultSellPrice
          }
        }
        return updated
      })
    )
  }

  const handleBatchSubmit = async () => {
    const validRows = batchRows.filter(r => r.variantId && r.qty > 0)
    if (validRows.length === 0) {
      toast('Please configure at least one row with a variant and positive quantity', 'error')
      return
    }
    setBatchSubmitting(true)
    try {
      for (const row of validRows) {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantId: row.variantId,
            qty: Number(row.qty),
            buyingPrice: Number(row.buyingPrice),
            sellingPrice: Number(row.sellingPrice),
            supplier: row.supplier,
            notes: row.notes,
          }),
        })
      }
      toast(`Successfully received ${validRows.length} batch variants!`, 'success')
      router.push('/inventory')
    } catch {
      toast('Error submitting batch', 'error')
    } finally {
      setBatchSubmitting(false)
    }
  }

  const downloadCsvTemplate = () => {
    const header = 'Category,Product,Color,Size,Quantity,BuyingPrice,SellingPrice\n'
    const samples = [
      'Medical Apparel,Tanc Core Scrub Set,Navy Blue,M,10,20.00,30.00',
      'Medical Apparel,Tanc Lite Scrub Set,Ceil Blue,L,8,24.00,35.00',
      'Medical Apparel,Tanc Knee-Length Lab Coat,White,M,5,13.00,20.00',
      'Medical Apparel,Female Softshell Jacket,Black,S,6,23.00,35.00',
    ].join('\n')
    const blob = new Blob([header + samples], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'podmyth_inventory_shipment_template.csv'
    a.click()
  }

  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      toast('Please paste CSV contents or upload a file', 'error')
      return
    }
    setCsvSubmitting(true)
    try {
      const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
      const dataLines = lines[0].toLowerCase().includes('category') ? lines.slice(1) : lines
      let imported = 0

      for (const line of dataLines) {
        const parts = line.split(',').map(p => p.trim())
        if (parts.length < 7) continue
        const [category, product, color, size, qtyStr, buyStr, sellStr] = parts
        const qty = parseInt(qtyStr)
        const buy = parseFloat(buyStr)
        const sell = parseFloat(sellStr)

        // Find variant matching product name, color, size
        const matched = variants.find(
          v =>
            v.product.name.toLowerCase() === product.toLowerCase() &&
            v.color.toLowerCase() === color.toLowerCase() &&
            v.size.toLowerCase() === size.toLowerCase()
        )

        if (matched && !isNaN(qty) && qty > 0) {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              variantId: matched.id,
              qty,
              buyingPrice: !isNaN(buy) ? buy : matched.defaultBuyPrice,
              sellingPrice: !isNaN(sell) ? sell : matched.defaultSellPrice,
              supplier: 'CSV Shipment Upload',
              notes: `Bulk imported line`,
            }),
          })
          imported++
        }
      }

      toast(`Successfully imported and restocked ${imported} items!`, 'success')
      router.push('/inventory')
    } catch {
      toast('CSV parsing error', 'error')
    } finally {
      setCsvSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="p-2 border border-[#E5E5E5] hover:bg-[#F8F9FA]">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              Receive Stock / Upload Shipment
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Restock variants, update cost & selling prices, and log immutable inbound audit records
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex border border-[#E5E5E5] bg-white">
          <button
            onClick={() => setMode('batch')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'batch' ? 'bg-[#111111] text-white' : 'text-gray-600 hover:text-[#111111]'
            }`}
          >
            Quick Batch Grid
          </button>
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'single' ? 'bg-[#111111] text-white' : 'text-gray-600 hover:text-[#111111]'
            }`}
          >
            Single SKU Form
          </button>
          <button
            onClick={() => setMode('csv')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'csv' ? 'bg-[#C62828] text-white' : 'text-gray-600 hover:text-[#111111]'
            }`}
          >
            Bulk CSV Upload
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 1: QUICK BATCH ENTRY GRID */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {mode === 'batch' && (
        <div className="space-y-4">
          <div className="card p-0">
            <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Shipment Receiving Grid
                </h2>
                <p className="text-[11px] text-gray-500">Add multiple inbound SKUs from the same supplier or delivery</p>
              </div>
              <button
                type="button"
                onClick={addBatchRow}
                className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
              >
                <Plus size={13} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left">Variant / SKU</th>
                    <th className="table-header text-center w-24">Qty Received</th>
                    <th className="table-header text-right w-32">Unit Buy Price</th>
                    <th className="table-header text-right w-32">Unit Sell Price</th>
                    <th className="table-header text-left w-36">Supplier</th>
                    <th className="table-header text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {batchRows.map((row, idx) => (
                    <tr key={row.tempId} className="hover:bg-[#F8F9FA]">
                      <td className="p-3">
                        <select
                          className="select text-xs"
                          value={row.variantId}
                          onChange={e => updateBatchRow(row.tempId, 'variantId', e.target.value)}
                        >
                          <option value="">Select Variant (Color & Size)...</option>
                          {variants.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.product.name} - {v.color} / {v.size} (Current: {v.stockQty})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="1"
                          className="input text-xs text-center font-bold tabular-nums"
                          value={row.qty}
                          onChange={e => updateBatchRow(row.tempId, 'qty', parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input text-xs text-right tabular-nums"
                          value={row.buyingPrice}
                          onChange={e => updateBatchRow(row.tempId, 'buyingPrice', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input text-xs text-right tabular-nums font-bold"
                          value={row.sellingPrice}
                          onChange={e => updateBatchRow(row.tempId, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          className="input text-xs"
                          value={row.supplier}
                          onChange={e => updateBatchRow(row.tempId, 'supplier', e.target.value)}
                        />
                      </td>
                      <td className="p-3 text-center">
                        {batchRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBatchRow(row.tempId)}
                            className="text-gray-400 hover:text-[#C62828]"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/inventory" className="btn-secondary text-xs">Cancel</Link>
            <button
              onClick={handleBatchSubmit}
              disabled={batchSubmitting}
              className="btn-primary text-xs font-bold py-2.5 px-6"
            >
              {batchSubmitting ? 'Receiving...' : `Process & Commit Batch (${batchRows.length} Items)`}
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 2: SINGLE SKU RESTOCK FORM */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {mode === 'single' && (
        <div className="card max-w-xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">
            Single Item Restock Entry
          </h2>
          <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="label">Select Variant *</label>
              <select
                className="select"
                value={singleVariantId}
                onChange={e => handleSelectSingle(e.target.value)}
              >
                {variants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.product.name} - {v.color} / {v.size} (Current: {v.stockQty} in stock)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Quantity Received *</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input font-bold tabular-nums"
                  value={singleQty}
                  onChange={e => setSingleQty(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="label">Unit Buying Price (COGS) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="input tabular-nums"
                  value={singleBuyPrice}
                  onChange={e => setSingleBuyPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="label">Unit Selling Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="input font-bold tabular-nums"
                  value={singleSellPrice}
                  onChange={e => setSingleSellPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supplier / Factory</label>
                <input
                  className="input"
                  value={singleSupplier}
                  onChange={e => setSingleSupplier(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Receiving Notes</label>
                <input
                  className="input"
                  value={singleNotes}
                  onChange={e => setSingleNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
              <Link href="/inventory" className="btn-secondary">Cancel</Link>
              <button
                type="submit"
                disabled={singleSubmitting}
                className="btn-primary"
              >
                {singleSubmitting ? 'Recording...' : 'Commit Stock Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 3: BULK CSV IMPORT */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {mode === 'csv' && (
        <div className="card space-y-6">
          <div className="flex items-start justify-between pb-4 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Bulk CSV / Excel Shipment Import
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload or paste a shipment spreadsheet containing multiple variants and restocking counts
              </p>
            </div>
            <button
              onClick={downloadCsvTemplate}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Download size={13} />
              Download CSV Template
            </button>
          </div>

          <div>
            <label className="label">Required CSV Header & Format:</label>
            <div className="bg-[#F8F9FA] border border-[#E5E5E5] p-3 font-mono text-[11px] text-gray-700">
              Category,Product,Color,Size,Quantity,BuyingPrice,SellingPrice
            </div>
          </div>

          <div>
            <label className="label">Paste Raw CSV Content below:</label>
            <textarea
              className="input font-mono text-xs h-48"
              placeholder={`Category,Product,Color,Size,Quantity,BuyingPrice,SellingPrice\nMedical Apparel,Tanc Core Scrub Set,Navy Blue,M,10,20.00,30.00\nMedical Apparel,Tanc Lite Scrub Set,Ceil Blue,L,5,24.00,35.00`}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/inventory" className="btn-secondary text-xs">Cancel</Link>
            <button
              onClick={handleCsvImport}
              disabled={csvSubmitting}
              className="btn-primary text-xs flex items-center gap-2"
            >
              <Upload size={14} />
              {csvSubmitting ? 'Importing & Updating Stock...' : 'Import & Commit Shipment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
