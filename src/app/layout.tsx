import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/Toaster'

export const metadata: Metadata = {
  title: 'PodMyth Finance',
  description: 'Finance, Billing & Inventory Management - PodMyth Medical Apparel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden bg-white">
          <Sidebar />
          <main className="flex-1 overflow-y-auto lg:ml-64">
            <div className="min-h-screen">{children}</div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
