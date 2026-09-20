import { useId, useState } from 'react'

/**
 * A calm column chart for completeness-over-time, with the average marked as
 * a dashed reference line (labelled, not colour-only). Faint graph-paper
 * gridlines — the system's one sanctioned measurement-chart material.
 */
export function WeekColumns({
  data,
  name,
  width = 480,
  height = 148,
}: {
  data: { week: string; value: number }[]
  name: string
  width?: number
  height?: number
}) {
  const uid = useId()
  const [active, setActive] = useState<number | null>(null)

  if (data.length === 0) {
    return <div className="px-4 py-8 text-center text-[13px] text-ink-3">No data yet</div>
  }

  const avg = data.reduce((s, d) => s + d.value, 0) / data.length
  const padX = 10
  const padTop = 18
  const padBottom = 22
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const barW = innerW / data.length
  const y = (v: number) => padTop + innerH - Math.max(0, Math.min(1, v)) * innerH

  return (
    <div className="relative">
      <svg
        role="img"
        aria-labelledby={`${uid}-t`}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={`${uid}-t`}>
          {name}: {data.map((d) => `${d.week} ${Math.round(d.value * 100)}%`).join(', ')}. Average {Math.round(avg * 100)}%.
        </title>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padX} x2={width - padX} y1={y(g)} y2={y(g)} stroke="var(--color-grid)" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = padX + i * barW
          const bh = innerH - (y(d.value) - padTop)
          return (
            <g key={d.week}>
              <rect
                x={x + barW * 0.2}
                y={y(d.value)}
                width={Math.max(2, barW * 0.6)}
                height={Math.max(0, bh)}
                rx={2}
                fill={active === i ? 'var(--color-accent-strong)' : 'var(--color-accent)'}
                tabIndex={0}
                role="button"
                aria-label={`${d.week}: ${Math.round(d.value * 100)}%`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                className="cursor-pointer outline-none"
              />
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--color-ink-3)">
                {d.week}
              </text>
            </g>
          )
        })}
        <line x1={padX} x2={width - padX} y1={y(avg)} y2={y(avg)} stroke="var(--color-ink-2)" strokeWidth={1.25} strokeDasharray="3 3" />
        <text x={width - padX} y={y(avg) - 5} textAnchor="end" fontSize={10} fill="var(--color-ink)" fontWeight={600} stroke="var(--color-surface)" strokeWidth={3} paintOrder="stroke">
          avg {Math.round(avg * 100)}%
        </text>
      </svg>
      {active != null && (
        <div
          role="tooltip"
          className="animate-fade pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-[11px] font-medium whitespace-nowrap text-paper"
          style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
        >
          {data[active].week} · <span className="tnum">{Math.round(data[active].value * 100)}%</span>
        </div>
      )}
      <span className="sr-only">
        {name}, {data.length} weeks, average {Math.round(avg * 100)}%: {data.map((d) => `${d.week} ${Math.round(d.value * 100)}%`).join('; ')}.
      </span>
    </div>
  )
}
