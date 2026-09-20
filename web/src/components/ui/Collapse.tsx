import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Measured-height disclosure — a transition to `auto` does not animate, so the
 * height is read from the content and written inline, then settled back to
 * `auto` once open so the region still reflows if its content changes.
 */
export function Collapse({ open, children, className, id }: { open: boolean; children: ReactNode; className?: string; id?: string }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>(open ? 'auto' : 0)

  useEffect(() => {
    const el = inner.current
    if (!el) return
    if (open) {
      setHeight(el.scrollHeight)
      const timer = setTimeout(() => setHeight('auto'), 300)
      return () => clearTimeout(timer)
    }
    setHeight(el.scrollHeight)
    const frame = requestAnimationFrame(() => setHeight(0))
    return () => cancelAnimationFrame(frame)
  }, [open])

  return (
    <div
      id={id}
      className={cn('cn-collapse', className)}
      data-open={open ? 'true' : 'false'}
      style={{ height: height === 'auto' ? 'auto' : `${height}px` }}
      aria-hidden={!open}
      inert={!open}
    >
      <div ref={inner}>{children}</div>
    </div>
  )
}
