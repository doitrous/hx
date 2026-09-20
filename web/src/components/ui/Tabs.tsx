import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  value: string
  label: string
  count?: number
}

/**
 * A single sliding rule, measured from the active tab's own button — the
 * movement is what tells you where the selection went, rather than one rule
 * per tab appearing and disappearing. Falls back gracefully if it can't
 * measure yet (first paint): the indicator simply has zero width until then.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!active) return
    setRect({ left: active.offsetLeft, width: active.offsetWidth })
  }, [value, items])

  return (
    <div ref={listRef} role="tablist" className={cn('relative flex items-center gap-5 border-b border-line', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 whitespace-nowrap pb-2.5 text-[13.5px] font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              active ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {item.label}
            {item.count != null && (
              <span className={cn('tnum rounded-full px-1.5 text-[11px] font-medium', active ? 'bg-primary-tint text-primary-strong' : 'bg-inset text-ink-2')}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
      <span className="cn-tab-indicator" style={{ transform: `translateX(${rect.left}px)`, width: rect.width }} />
    </div>
  )
}
