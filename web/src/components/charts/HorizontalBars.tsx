import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BarRow = {
  key: string
  label: ReactNode
  sublabel?: ReactNode
  /** Plain-text form of label/sublabel, for the accessible name and sr-only list. */
  text: string
  value: number
  displayValue: string
  color?: string
  onClick?: () => void
}

/**
 * A ranked horizontal-bar list: thin rounded-end marks, direct labels,
 * identity carried by the label rather than colour. Used for "most missed"
 * fields and case mix by system — never a donut ring.
 */
export function HorizontalBars({
  rows,
  max,
  name,
  labelWidth = 'w-40',
  className,
}: {
  rows: BarRow[]
  max?: number
  name: string
  labelWidth?: string
  className?: string
}) {
  if (rows.length === 0) {
    return <div className="px-4 py-8 text-center text-[13px] text-ink-3">No data yet</div>
  }
  const computedMax = max ?? Math.max(...rows.map((r) => r.value), 1)

  return (
    <div
      className={cn('flex flex-col', className)}
      role="img"
      aria-label={`${name}: ${rows.map((r) => `${r.text} ${r.displayValue}`).join(', ')}`}
    >
      {rows.map((row) => {
        const pct = computedMax > 0 ? Math.max(2, (row.value / computedMax) * 100) : 2
        const Comp = row.onClick ? 'button' : 'div'
        return (
          <Comp
            key={row.key}
            type={row.onClick ? 'button' : undefined}
            onClick={row.onClick}
            className={cn(
              'flex items-start gap-3 border-b border-line px-4 py-2.5 text-start last:border-b-0',
              row.onClick &&
                'w-full transition-colors hover:bg-inset/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
            )}
          >
            <div className={cn('shrink-0 pt-0.5', labelWidth)}>
              <div className="truncate text-[12.5px] font-medium text-ink">{row.label}</div>
              {row.sublabel && <div className="truncate text-[11px] text-ink-3">{row.sublabel}</div>}
            </div>
            <div className="min-w-0 flex-1 self-center">
              <div className="h-2 overflow-hidden rounded-full bg-inset">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color ?? 'var(--color-primary)' }} />
              </div>
            </div>
            <div className="tnum w-12 shrink-0 pt-0.5 text-end text-[12.5px] font-semibold text-ink">{row.displayValue}</div>
          </Comp>
        )
      })}
    </div>
  )
}
