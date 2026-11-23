'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import { Plus, Trash2, ArrowLeft, DollarSign, Calendar, Tag, FileText } from 'lucide-react'

interface ExpenseItem {
  id: string
  category: string
  description: string
  amount: number
  date: string
  notes?: string | null
}

const CATEGORIES = [
  { id: 'PACKAGING', label: 'Packaging & Branding' },
  { id: 'MARKETING', label: 'Marketing & Ads' },
  { id: 'EQUIPMENT', label: 'Equipment / Maintenance' },
  { id: 'TRANSPORT', label: 'General Transport & Fuel' },
  { id: 'OTHER', label: 'Other Operating Expenses' },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [category, setCategory] = useState('PACKAGING')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expenses')
      const json = await res.json()
      setExpenses((json.data ?? []).map((e: any) => ({
        ...e,
        amount: Number(e.amount),
      })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid amount', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          amount: amt,
          date,
          notes,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Failed to record expense', 'error')
        return
      }
      toast('Overhead expense recorded successfully!', 'success')
      setShowModal(false)
      setDescription('')
      setAmount('')
      setNotes('')
      loadExpenses()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense record?')) return
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      toast('Expense removed', 'info')
      loadExpenses()
    } catch {
      toast('Failed to delete expense', 'error')
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">Overhead Expense Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track operational expenses separately from per-order buying costs to prevent double-counting COGS
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Operating Expense
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-[#C62828]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Overheads</p>
          <p className="text-2xl font-black text-[#C62828] tabular-nums">{formatCurrency(totalExpenses)}</p>
          <p className="text-[11px] text-gray-400 mt-1">Deducted from Gross Profit on P&L</p>
        </div>

        <div className="stat-card border-l-4 border-l-[#111111]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expense Entries</p>
          <p className="text-2xl font-black text-[#111111] tabular-nums">{expenses.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">Non-order operational costs</p>
        </div>

        <div className="stat-card border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Top Category</p>
          <p className="text-base font-black text-[#111111] mt-1 truncate">
            {expenses.length > 0 ? CATEGORIES.find(c => c.id === expenses[0]?.category)?.label || 'Packaging' : 'None'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Primary overhead driver</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Category</th>
                <th className="table-header text-left">Description</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-left">Notes</th>
                <th className="table-header text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center text-xs text-gray-400">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-xs text-gray-400">No overhead expenses recorded yet.</td></tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell text-xs text-gray-500 font-mono">
                      {format(new Date(e.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="table-cell">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200">
                        {CATEGORIES.find(c => c.id === e.category)?.label || e.category}
                      </span>
                    </td>
                    <td className="table-cell text-xs font-semibold text-[#111111]">{e.description}</td>
                    <td className="table-cell text-right tabular-nums text-xs font-bold text-[#C62828]">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="table-cell text-xs text-gray-500 italic">{e.notes || '-'}</td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-gray-400 hover:text-[#C62828] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full border border-[#111111] p-6 shadow-2xl">
            <h2 className="text-base font-black text-[#111111] uppercase tracking-wider mb-4">
              Add Operational Overhead Expense
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="label">Category *</label>
                <select
                  className="select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Expense Description *</label>
                <input
                  required
                  className="input font-semibold"
                  placeholder="e.g. Branded packaging bags, Instagram ads..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="input font-bold tabular-nums"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Optional Notes</label>
                <input
                  className="input"
                  placeholder="Receipt number or details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
