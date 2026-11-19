'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Package,
  Users,
  TrendingUp,
  FileCheck2,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'

const MAIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/quotations', label: 'Quotations', icon: FileText },
  { href: '/clients', label: 'Client Directory', icon: Users },
  {
    label: 'Inventory',
    icon: Package,
    children: [
      { href: '/inventory', label: 'Stock Catalog ($655)' },
      { href: '/inventory/receive', label: 'Receive Shipment' },
      { href: '/inventory/movements', label: 'Movement Audit' },
      { href: '/inventory/stocktake', label: 'Stock Take Mode' },
    ],
  },
  {
    label: 'Finance',
    icon: TrendingUp,
    children: [
      { href: '/finance/pl', label: 'Profit & Loss' },
      { href: '/finance/cashflow', label: 'Cash Flow' },
      { href: '/finance/balance', label: 'Balance Sheet' },
      { href: '/finance/expenses', label: 'Operating Expenses' },
      { href: '/subscriptions', label: 'Member Contributions' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(['Inventory', 'Finance'])

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const NavContent = () => (
    <nav className="flex flex-col h-full bg-white text-[#111111]">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#C62828] flex items-center justify-center font-black text-white text-xs tracking-tighter">
            PM
          </div>
          <div>
            <div className="text-[13px] font-black text-[#111111] tracking-widest uppercase">
              PODMYTH
            </div>
            <div className="text-[9px] text-[#C62828] font-bold tracking-widest uppercase">
              Finance & Inventory
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {MAIN_NAV.map(item => {
          if (item.children) {
            const isGroupOpen = openGroups.includes(item.label)
            const hasActive = item.children.some(c => isActive(c.href))
            return (
              <div key={item.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    hasActive ? 'text-[#C62828]' : 'text-gray-700 hover:bg-[#F8F9FA]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={15} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`transition-transform text-gray-400 ${isGroupOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isGroupOpen && (
                  <div className="ml-5 mt-0.5 border-l-2 border-[#E5E5E5] pl-3 space-y-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-3 py-1.5 text-xs transition-colors ${
                          isActive(child.href)
                            ? 'text-[#C62828] font-black border-l-2 border-[#C62828] -ml-[14px] pl-[12px] bg-red-50/40'
                            : 'text-gray-600 hover:text-[#111111] font-medium'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const active = isActive(item.href!)
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                active ? 'bg-[#111111] text-white' : 'text-gray-700 hover:bg-[#F8F9FA]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon size={15} className={active ? 'text-white' : 'text-gray-500'} />
                <span>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Down Below: Dedicated Audit Report Link */}
      <div className="px-3 py-3 border-t border-[#E5E5E5] bg-[#F8F9FA]">
        <Link
          href="/reconciliation"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
            isActive('/reconciliation')
              ? 'bg-[#111111] text-white border-[#111111]'
              : 'bg-white text-[#C62828] border-red-200 hover:border-[#C62828]'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileCheck2 size={14} className={isActive('/reconciliation') ? 'text-white' : 'text-[#C62828]'} />
            <span>Audit Report</span>
          </div>
          <span className="text-[10px] font-black tabular-nums">OCT '26</span>
        </Link>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 border-t border-[#E5E5E5] bg-white">
        <div className="flex items-center justify-between text-[11px] text-gray-600">
          <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Total Assets</span>
          <span className="font-mono font-bold text-[#111111] tabular-nums">$1,040.00</span>
        </div>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E5E5E5] z-30">
        <NavContent />
      </aside>

      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#C62828] flex items-center justify-center font-black text-white text-[10px]">
            PM
          </div>
          <span className="text-sm font-black text-[#111111] tracking-widest uppercase">PodMyth</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-white z-50 shadow-xl">
            <NavContent />
          </aside>
        </>
      )}

      {/* Mobile top spacing */}
      <div className="lg:hidden h-14" />
    </>
  )
}
