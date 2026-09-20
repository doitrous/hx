import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** A click-triggered surface anchored to its trigger. Closes on outside click or Escape. */
export function Popover({
  trigger,
  children,
  align = 'start',
  className,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ onClick: () => setOpen((v) => !v), 'aria-expanded': open })}
      {open && (
        <div
          role="menu"
          className={cn(
            'animate-pop absolute top-[calc(100%+6px)] z-40 min-w-40 rounded-lg border border-line bg-surface p-1 shadow-pop',
            align === 'end' ? 'end-0' : 'start-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** A hover/focus-triggered label for an icon-only or ambiguous control. Never the only way to learn required information. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className="animate-fade pointer-events-none absolute bottom-[calc(100%+6px)] start-1/2 z-40 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[11.5px] font-medium whitespace-nowrap text-paper"
        >
          {label}
        </span>
      )}
    </span>
  )
}
