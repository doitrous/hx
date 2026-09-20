import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'
import { cn } from '@/lib/cn'

type ToastTone = 'neutral' | 'success' | 'danger'
type ToastEntry = { id: number; message: string; tone: ToastTone }

const TONE_ICON = { neutral: Info, success: CheckCircle2, danger: AlertTriangle }
const TONE_CLASS: Record<ToastTone, string> = {
  neutral: 'text-ink-2',
  success: 'text-success',
  danger: 'text-danger',
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

/** Wrap the app once. `useToast()` returns a function: `toast('Saved', 'success')`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(0)

  const push = useCallback((message: string, tone: ToastTone = 'neutral') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
        <div className="fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="region" aria-label="Notifications">
          {toasts.map((t) => {
            const Glyph = TONE_ICON[t.tone]
            return (
              <div
                key={t.id}
                role="status"
                className="animate-pop flex w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] text-ink shadow-pop"
              >
                <Glyph size={16} strokeWidth={2.15} className={cn('shrink-0', TONE_CLASS[t.tone])} aria-hidden />
                <span className="min-w-0 flex-1">{t.message}</span>
                <IconButton
                  icon={X}
                  label="Dismiss"
                  size="sm"
                  onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
                />
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
