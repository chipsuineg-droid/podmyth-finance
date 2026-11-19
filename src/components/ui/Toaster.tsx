'use client'
import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: string; message: string; type: ToastType }

let addToastFn: ((msg: string, type?: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  if (addToastFn) addToastFn(message, type)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 border shadow-lg bg-white ${
            t.type === 'error' ? 'border-[#C62828]' :
            t.type === 'success' ? 'border-green-500' : 'border-[#111111]'
          }`}
        >
          {t.type === 'success' && <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />}
          {t.type === 'error' && <AlertCircle size={16} className="text-[#C62828] mt-0.5 shrink-0" />}
          {t.type === 'info' && <Info size={16} className="text-[#111111] mt-0.5 shrink-0" />}
          <span className="text-sm text-[#111111] flex-1">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="text-gray-400 hover:text-[#111111] shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
