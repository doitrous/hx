import { useId, useState } from 'react'
import { formatDate } from './format'

export type TimelinePoint = {
  id: string
  date: string
  label: string
  status: 'draft' | 'final'
  onSelect?: () => void
}

/**
 * A compact chronology strip: one ruled line, a marker per encounter. Status
 * is never colour-only — draft is a diamond, final a circle, and both carry
 * the word in the tooltip/accessible name.
 */
export function Timeline({
  points,
  name,
  width = 640,
  height = 56,
}: {
  points: TimelinePoint[]
  name: string
  width?: number
  height?: number
}) {
  const uid = useId()
  const [active, setActive] = useState<number | null>(null)

  if (points.length === 0) {
    return <div className="px-4 py-8 text-center text-[13px] text-ink-3">No encounters yet</div>
  }

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const times = sorted.map((p) => new Date(p.date).getTime())
  const lo = times[0]
  const hi = times[times.length - 1]
  const span = hi - lo || 1
  const padX = 18
  const innerW = width - padX * 2
  const x = (i: number) => (sorted.length === 1 ? width / 2 : padX + ((times[i] - lo) / span) * innerW)
  const midY = height / 2

  return (
    <div className="relative">
      <svg role="img" aria-labelledby={`${uid}-t`} width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <title id={`${uid}-t`}>
          {name}: {sorted.map((p) => `${formatDate(p.date)} ${p.label}, ${p.status}`).join('; ')}
        </title>
        <line x1={padX} x2={width - padX} y1={midY} y2={midY} stroke="var(--color-line-2)" strokeWidth={1} />
        {sorted.map((p, i) => {
          const cx = x(i)
          const isDraft = p.status === 'draft'
          return (
            <g key={p.id}>
              {isDraft ? (
                <rect
                  x={cx - 4}
                  y={midY - 4}
                  width={8}
                  height={8}
                  transform={`rotate(45 ${cx} ${midY})`}
                  fill="var(--color-warning)"
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                />
              ) : (
                <circle cx={cx} cy={midY} r={4.5} fill="var(--color-success)" stroke="var(--color-surface)" strokeWidth={1.5} />
              )}
              <circle
                cx={cx}
                cy={midY}
                r={12}
                fill="transparent"
                tabIndex={p.onSelect ? 0 : undefined}
                role={p.onSelect ? 'button' : undefined}
                aria-label={`${formatDate(p.date)}: ${p.label}, ${p.status}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                onClick={p.onSelect}
                className={p.onSelect ? 'cursor-pointer outline-none' : undefined}
              />
            </g>
          )
        })}
      </svg>
      {active != null && (
        <div
          role="tooltip"
          className="animate-fade pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-[11px] font-medium whitespace-nowrap text-paper"
          style={{ left: `${(x(active) / width) * 100}%` }}
        >
          {formatDate(sorted[active].date)} · {sorted[active].label} · {sorted[active].status}
        </div>
      )}
    </div>
  )
}
