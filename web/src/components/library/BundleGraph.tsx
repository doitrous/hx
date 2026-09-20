import { useId } from 'react'
import { systemColor } from '@/lib/systems'
import type { Bundle } from '@/lib/types'

type Neighbour = { bundle: Bundle; reason?: string; direction: 'out' | 'in' }

/**
 * The one on-demand local graph the research brief allows: the selected
 * bundle in the centre, its immediate links around it, nothing more — never
 * the full ~160-bundle hairball. Direction is a solid arrow (opens) vs a
 * dashed line (opened by), never colour alone; the system's spine colour
 * rings each neighbour, matching SystemChip's "spine, never a fill" rule.
 */
export function BundleGraph({
  center,
  opens,
  openedBy,
  onSelect,
  width = 480,
  height = 320,
}: {
  center: Bundle
  opens: { bundle: Bundle; reason?: string }[]
  openedBy: { bundle: Bundle; reason?: string }[]
  onSelect: (id: string) => void
  width?: number
  height?: number
}) {
  const uid = useId()
  const seen = new Map<string, Neighbour>()
  for (const o of opens) seen.set(o.bundle.id, { bundle: o.bundle, reason: o.reason, direction: 'out' })
  for (const o of openedBy) if (!seen.has(o.bundle.id)) seen.set(o.bundle.id, { bundle: o.bundle, reason: o.reason, direction: 'in' })
  const neighbours = [...seen.values()]

  if (neighbours.length === 0) {
    return <div className="px-2 py-10 text-center text-[13px] text-ink-3">No connections to draw — this bundle stands alone.</div>
  }

  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) / 2 - 58

  const positioned = neighbours.map((n, i) => {
    const angle = (i / neighbours.length) * Math.PI * 2 - Math.PI / 2
    return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  return (
    <svg role="img" aria-labelledby={`${uid}-t`} width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <title id={`${uid}-t`}>
        {center.title} and its one-hop connections: {neighbours.map((n) => `${n.direction === 'out' ? 'opens' : 'opened by'} ${n.bundle.title}`).join('; ')}
      </title>
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-line-2)" />
        </marker>
      </defs>
      {positioned.map((n) => (
        <line
          key={n.bundle.id}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke="var(--color-line-2)"
          strokeWidth={1.25}
          strokeDasharray={n.direction === 'in' ? '4 3' : undefined}
          markerEnd={n.direction === 'out' ? `url(#${uid}-arrow)` : undefined}
        />
      ))}

      <g>
        <circle cx={cx} cy={cy} r={34} fill="var(--color-primary-tint)" stroke="var(--color-primary)" strokeWidth={1.5} />
        <foreignObject x={cx - 46} y={cy - 22} width={92} height={44}>
          <div className="flex h-full items-center justify-center px-1 text-center text-[10.5px] leading-tight font-semibold text-primary-strong">
            {center.title}
          </div>
        </foreignObject>
      </g>

      {positioned.map((n) => (
        <g
          key={n.bundle.id}
          tabIndex={0}
          role="button"
          aria-label={`${n.direction === 'out' ? 'Opens' : 'Opened by'} ${n.bundle.title}${n.reason ? `: ${n.reason}` : ''}. Select to re-centre the graph on it.`}
          onClick={() => onSelect(n.bundle.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(n.bundle.id)
            }
          }}
          className="cursor-pointer outline-none"
        >
          <circle cx={n.x} cy={n.y} r={26} fill="var(--color-surface)" stroke={systemColor(n.bundle.system)} strokeWidth={2.5} />
          <foreignObject x={n.x - 42} y={n.y - 20} width={84} height={40}>
            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight font-medium text-ink">
              {n.bundle.title}
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  )
}
