'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/finance'
import { toast } from '@/components/ui/Toaster'
import { Search, Plus, User, Phone, MapPin, DollarSign, TrendingUp, Clock, X } from 'lucide-react'

interface ClientRow {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  city?: string | null
  deliveryZone?: string | null
  notes?: string | null
  totalRevenue: number
  totalProfit: number
  totalCollected: number
  arBalance: number
  orderCount: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New Client Form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [deliveryZone, setDeliveryZone] = useState('')
  const [notes, setNotes] = useState('')

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setClients(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast('Client name is required', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, city, deliveryZone, notes }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast(json.error || 'Failed to create client', 'error')
        return
      }
      toast('Client created successfully!', 'success')
      setShowModal(false)
      setName('')
      setPhone('')
      setEmail('')
      setCity('')
      setDeliveryZone('')
      setNotes('')
      loadClients()
    } finally {
      setSubmitting(false)
    }
  }

  const totalClients = clients.length
  const totalRevenue = clients.reduce((s, c) => s + c.totalRevenue, 0)
  const totalAR = clients.reduce((s, c) => s + c.arBalance, 0)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">Client Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Medical practitioners, hospitals & direct apparel clients</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <Plus size={15} />
          Add Client
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card border-l-4 border-l-[#111111]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Clients</p>
          <p className="text-xl font-black text-[#111111] tabular-nums">{totalClients}</p>
        </div>
        <div className="stat-card border-l-4 border-l-green-600">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Lifetime Revenue</p>
          <p className="text-xl font-black text-[#111111] tabular-nums">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className={`stat-card border-l-4 ${totalAR > 0 ? 'border-l-[#C62828]' : 'border-l-gray-300'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Outstanding Receivables</p>
          <p className={`text-xl font-black tabular-nums ${totalAR > 0 ? 'text-[#C62828]' : 'text-gray-800'}`}>
            {formatCurrency(totalAR)}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4 relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by client name, title or phone..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Clients Table */}
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Client Name & Title</th>
                <th className="table-header text-left">Phone / WhatsApp</th>
                <th className="table-header text-left">City / Zone</th>
                <th className="table-header text-center">Orders</th>
                <th className="table-header text-right">Lifetime Revenue</th>
                <th className="table-header text-right">Profit Generated</th>
                <th className="table-header text-right">AR Balance</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">Loading directory...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                    No clients found. Click "Add Client" to register one.
                  </td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell">
                      <Link href={`/clients/${c.id}`} className="font-bold text-[#111111] hover:text-[#C62828] text-sm">
                        {c.name}
                      </Link>
                      {c.notes && <p className="text-[11px] text-gray-400 italic mt-0.5">{c.notes}</p>}
                    </td>
                    <td className="table-cell text-xs text-gray-600 font-mono">
                      {c.phone || '—'}
                    </td>
                    <td className="table-cell text-xs text-gray-600">
                      {c.city ? `${c.city}${c.deliveryZone ? ` (${c.deliveryZone})` : ''}` : '—'}
                    </td>
                    <td className="table-cell text-center tabular-nums text-xs font-bold">
                      {c.orderCount}
                    </td>
                    <td className="table-cell text-right tabular-nums text-xs font-bold text-[#111111]">
                      {formatCurrency(c.totalRevenue)}
                    </td>
                    <td className={`table-cell text-right tabular-nums text-xs font-semibold ${c.totalProfit < 0 ? 'text-[#C62828]' : 'text-green-700'}`}>
                      {formatCurrency(c.totalProfit)}
                    </td>
                    <td className="table-cell text-right tabular-nums text-xs">
                      <span className={`font-black ${c.arBalance > 0 ? 'text-[#C62828]' : 'text-gray-400'}`}>
                        {formatCurrency(c.arBalance)}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <Link
                        href={`/clients/${c.id}`}
                        className="text-xs text-[#111111] hover:text-[#C62828] font-bold underline"
                      >
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full border border-[#111111] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] mb-4">
              <h2 className="text-base font-black text-[#111111] uppercase tracking-wider">
                Register New Client Profile
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-[#111111]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="label">Title & Full Name *</label>
                <input
                  required
                  className="input font-semibold"
                  placeholder="e.g. Dr. Tanya Rubaya, Mr. Persiema RGN/OTN"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone / WhatsApp</label>
                  <input
                    className="input"
                    placeholder="e.g. +263 77 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="dr.rubaya@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input
                    className="input"
                    placeholder="e.g. Harare, Bulawayo, Mutare"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Delivery Zone</label>
                  <input
                    className="input"
                    placeholder="e.g. CBD, Avondale, Outside Harare"
                    value={deliveryZone}
                    onChange={e => setDeliveryZone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Internal Notes</label>
                <textarea
                  className="input h-20"
                  placeholder="e.g. Prefers slim fit trousers; size medium tops..."
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
                  {submitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
