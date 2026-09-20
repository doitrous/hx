import { cn } from '@/lib/cn'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const FILL: Record<Tone, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-ink-3',
}

const HEIGHT = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/**
 * The calibrated instrument: a linear reading against a track that fills once
 * on mount, like a gauge settling on its reading (see `.cn-meter-fill` /
 * `--dur-calibrate` in index.css). The final value stays put after motion.
 */
export function Meter({
  value,
  max = 100,
  tone = 'primary',
  size = 'md',
  className,
}: {
  value: number
  max?: number
  tone?: Tone
  size?: keyof typeof HEIGHT
  className?: string
}) {
  const p = clamp((value / max) * 100, 0, 100)
  return (
    <div
      className={cn('relative overflow-hidden rounded-full bg-inset', HEIGHT[size], className)}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className={cn('cn-meter-fill h-full rounded-full', FILL[tone])} style={{ width: `${p}%` }} />
    </div>
  )
}

/**
 * A reference-range scale: a value plotted against named zones (e.g. Building
 * / On track / Ready), rather than a bare percentage — the clinical
 * alternative to a generic donut ring. Zone boundaries are drawn as ticks so
 * the reading is legible without colour alone.
 */
export function RangeScale({
  value,
  max = 100,
  zones,
  className,
}: {
  value: number
  max?: number
  /** Zone boundaries as ascending percentages of `max`, e.g. [40, 70]. */
  zones: { label: string; upTo: number }[]
  className?: string
}) {
  const p = clamp((value / max) * 100, 0, 100)
  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-inset">
        <div className="cn-meter-fill h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
        {zones.slice(0, -1).map((z) => (
          <span
            key={z.label}
            aria-hidden
            className="absolute inset-y-0 w-px bg-surface/80"
            style={{ insetInlineStart: `${(z.upTo / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
        {zones.map((z) => (
          <span key={z.label}>{z.label}</span>
        ))}
      </div>
    </div>
  )
}
