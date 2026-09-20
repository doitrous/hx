import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatNumber } from './format'

export type SparkPoint = {
  label: string
  value: number
  /** Overrides the plotted-value text (e.g. "130/85" while `value` plots the systolic number). */
  display?: string
}

/**
 * A compressed time-series in the Powsner & Tufte style: a single hairline
 * trace, undecorated, with the last reading printed as text beside it rather
 * than read off an axis. No gradient fill under the line, no axis chrome.
 * Every point is reachable by mouse and keyboard (a transparent hit-target
 * circle) and announces itself via a tooltip and the SVG's own <title>; a
 * `sr-only` list is the non-visual text alternative.
 */
export function Sparkline({
  points,
  unit,
  name,
  band,
  width = 148,
  height = 36,
  formatValue = formatNumber,
  className,
}: {
  points: SparkPoint[]
  unit?: string
  /** Accessible name for the chart, e.g. "HbA1c trend". */
  name: string
  /** Optional reference band [low, high] drawn as a quiet band behind the trace. */
  band?: [number, number]
  width?: number
  height?: number
  formatValue?: (v: number) => string
  className?: string
}) {
  const uid = useId()
  const [active, setActive] = useState<number | null>(null)

  if (points.length === 0) {
    return <div className={cn('text-[12px] text-ink-3', className)}>No data yet</div>
  }

  const padX = 5
  const padY = 6
  const values = points.map((p) => p.value)
  const lo = Math.min(...values, band?.[0] ?? Infinity)
  const hi = Math.max(...values, band?.[1] ?? -Infinity)
  const span = hi - lo || 1
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const x = (i: number) => padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => padY + innerH - ((v - lo) / span) * innerH
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const text = (p: SparkPoint) => p.display ?? `${formatValue(p.value)}${unit ? ` ${unit}` : ''}`

  return (
    <div className={cn('relative inline-flex items-center gap-2.5', className)}>
      <svg role="img" aria-labelledby={`${uid}-t`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
        <title id={`${uid}-t`}>
          {name}: {points.map((p) => `${p.label} ${text(p)}`).join(', ')}
        </title>
        {band && (
          <rect x={padX} y={y(band[1])} width={innerW} height={Math.max(1, y(band[0]) - y(band[1]))} fill="var(--color-grid)" />
        )}
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--color-line)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--color-ink-2)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === points.length - 1 ? 2.5 : 1.75}
              fill={i === points.length - 1 ? 'var(--color-accent)' : 'var(--color-surface)'}
              stroke={i === points.length - 1 ? 'var(--color-accent)' : 'var(--color-ink-2)'}
              strokeWidth={1.25}
            />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={8}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${p.label}: ${text(p)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
              className="cursor-pointer outline-none"
            />
          </g>
        ))}
      </svg>
      {active != null && (
        <div
          role="tooltip"
          className="animate-fade pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-[11px] font-medium whitespace-nowrap text-paper"
          style={{ left: x(active) }}
        >
          {points[active].label} · <span className="tnum">{text(points[active])}</span>
        </div>
      )}
      <div className="shrink-0 text-end">
        <div className="tnum text-[13px] font-semibold text-ink">{text(last)}</div>
      </div>
      <span className="sr-only">
        {name}, {points.length} readings: {points.map((p) => `${p.label} ${text(p)}`).join('; ')}.
      </span>
    </div>
  )
}
