import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Panel } from './Panel'
import { cn } from '@/lib/cn'

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** A modal task surface: bottom sheet on a phone, centred panel from `sm`. Owns Escape, a focus trap and returning focus. */
export function Dialog({
  onClose,
  label,
  size = 'md',
  className,
  children,
}: {
  onClose: () => void
  /** Names the dialog for assistive technology. */
  label: string
  size?: keyof typeof SIZES
  className?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = bodyOverflow
      previous?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div
      className="animate-fade fixed inset-0 z-50 grid items-end bg-ink/30 p-0 sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={onClose}
    >
      <Panel
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'animate-pop max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-b-none shadow-pop focus:outline-none sm:rounded-xl',
          SIZES[size],
          className,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </Panel>
    </div>,
    document.body,
  )
}
