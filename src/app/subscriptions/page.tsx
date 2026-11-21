'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/finance'
import { Users, CheckCircle, Clock, ArrowLeft, ShieldCheck, DollarSign } from 'lucide-react'

interface MemberRow {
  name: string
  months: Record<string, string>
  totalPaid: number
}

export default function SubscriptionsPage() {
  const [matrix, setMatrix] = useState<MemberRow[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscriptions')
      .then(r => r.json())
      .then(json => {
        setMatrix(json.data.matrix ?? [])
        setMonths(json.data.months ?? [])
        setLoading(false)
      })
  }, [])

  const totalCollected = matrix.reduce((sum, m) => sum + m.totalPaid, 0)

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Team Member Subscriptions Hub
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Internal partner monthly contributions ($10.00/month) for core operational capital
          </p>
        </div>

        <div className="stat-card py-2 px-4 border-l-4 border-l-green-600 bg-white">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Subscriptions Received</p>
          <p className="text-xl font-black text-green-700 tabular-nums">{formatCurrency(totalCollected)}</p>
        </div>
      </div>

      {/* Subscription Matrix Table */}
      <div className="card p-0">
        <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
            Monthly Contributions Matrix (2026)
          </h2>
          <span className="text-[11px] text-gray-400">$10.00 standard monthly dues</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#111111] text-white">
                <th className="py-2.5 px-4 text-left font-bold uppercase tracking-wider">Member Name</th>
                {months.map(mo => (
                  <th key={mo} className="py-2.5 px-4 text-center font-bold uppercase tracking-wider">{mo}</th>
                ))}
                <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {loading ? (
                <tr><td colSpan={months.length + 2} className="py-12 text-center text-gray-400">Loading subscriptions...</td></tr>
              ) : matrix.length === 0 ? (
                <tr><td colSpan={months.length + 2} className="py-12 text-center text-xs text-gray-400">No member contributions recorded ($0.00). Baseline active.</td></tr>
              ) : matrix.map(m => (
                <tr key={m.name} className="hover:bg-[#F8F9FA]">
                  <td className="py-3 px-4 font-bold text-[#111111]">{m.name}</td>
                  {months.map(mo => {
                    const status = m.months[mo] || 'PENDING'
                    const isPaid = status === 'PAID'
                    return (
                      <td key={mo} className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 border ${
                          isPaid
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {isPaid ? '$10.00' : 'Pending'}
                        </span>
                      </td>
                    )
                  })}
                  <td className="py-3 px-4 text-right font-black tabular-nums text-green-800">
                    {formatCurrency(m.totalPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-surface border-l-4 border-l-[#C62828] p-4 text-xs text-gray-700">
        <p className="font-bold text-[#111111] mb-1">Accounting Protocol:</p>
        <p>Member subscriptions are classified as internal equity additions / working capital injections and logged into cash receipts upon bank or mobile wallet verification.</p>
      </div>
    </div>
  )
}
