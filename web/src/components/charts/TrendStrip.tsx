import { Sparkline, type SparkPoint } from './Sparkline'
import { cn } from '@/lib/cn'

/**
 * One row of the patient record's trend list: label + n on the left, the
 * compressed trace (with its own last-value label) on the right. Reused for
 * every recurring numeric/bp field — no per-field bespoke layout.
 */
export function TrendStrip({
  label,
  unit,
  points,
  n,
  band,
  className,
}: {
  label: string
  unit?: string
  points: SparkPoint[]
  n: number
  band?: [number, number]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-b-0', className)}>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-medium text-ink">{label}</div>
        <div className="tnum text-[11.5px] text-ink-3">
          n={n}
          {unit ? ` · ${unit}` : ''}
        </div>
      </div>
      <Sparkline points={points} unit={unit} name={`${label} trend`} band={band} />
    </div>
  )
}
