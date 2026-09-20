import { useMemo, useState } from 'react'
import type { Bundle } from '@/lib/types'
import { displayTitle } from '@/components/sheet/bundleTree'

export type TracePoint = { answered: number; owed: number }

/**
 * Three small, honest charts. Two are counted from the live catalogue, one is
 * drawn from the visitor's own note as they write. Colour follows the product's
 * own meaning everywhere: blue is answered, crimson is still owed. That pair was
 * checked with the dataviz palette validator (passes lightness, chroma, colour
 * vision separation and contrast on the light surface).
 */
export function Charts({ bundles, trace }: { bundles: Bundle[] | null; trace: TracePoint[] }) {
  return (
    <section className="mx-auto w-full max-w-[1680px] px-4 pt-10 sm:px-8">
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr_1fr]">
        <Panel title="Your note, as you write it" takeaway="Questions open when you mention something. They close when you document it.">
          <CompletenessTrace trace={trace} />
        </Panel>
        <Panel title="Where the questions are" takeaway="Questions per body system or specialty in today's catalogue.">
          {bundles ? <BarList rows={bySystem(bundles).slice(0, 11)} unit="the number of questions" note={tailNote(bySystem(bundles), 11)} /> : <Placeholder />}
        </Panel>
        <Panel title="What most conditions lead to" takeaway="The question sets that the most other sets open as a follow-up.">
          {bundles ? <BarList rows={mostConnected(bundles)} unit="how many other sets lead here" /> : <Placeholder />}
        </Panel>
      </div>
    </section>
  )
}

function Panel({ title, takeaway, children }: { title: string; takeaway: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <figcaption>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">{takeaway}</p>
      </figcaption>
      <div className="mt-5 min-h-0 flex-1">{children}</div>
    </figure>
  )
}

function Placeholder() {
  return <div className="h-48 rounded-md bg-inset" />
}

// ---- Catalogue counts ------------------------------------------------------

type Row = { label: string; value: number; detail: string }

function bySystem(bundles: Bundle[]): Row[] {
  const map = new Map<string, { q: number; sets: number }>()
  for (const b of bundles) {
    const e = map.get(b.system) ?? { q: 0, sets: 0 }
    e.q += b.items.length
    e.sets += 1
    map.set(b.system, e)
  }
  const rows = [...map].map(([label, e]) => ({ label, value: e.q, detail: `${e.sets} question sets` })).sort((a, b) => b.value - a.value)
  return rows
}

/** A lumped "other" bar would be the longest on the chart and wreck the scale, so the tail is a sentence instead. */
function tailNote(rows: Row[], shown: number) {
  const rest = rows.slice(shown)
  return rest.length ? `Plus ${rest.reduce((n, r) => n + r.value, 0).toLocaleString('en')} questions across ${rest.length} smaller areas.` : ''
}

function mostConnected(bundles: Bundle[]): Row[] {
  const byId = new Map(bundles.map((b) => [b.id, b]))
  const incoming = new Map<string, string[]>()
  for (const b of bundles) for (const item of b.items) if (item.link && item.link !== b.id) incoming.set(item.link, [...(incoming.get(item.link) ?? []), displayTitle(b.title)])
  return [...incoming]
    .map(([id, from]) => ({ label: displayTitle(byId.get(id)?.title ?? id), value: from.length, detail: `Opened from ${from.slice(0, 4).join(', ')}${from.length > 4 ? ` and ${from.length - 4} more` : ''}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 11)
}

/** Magnitude across categories: thin horizontal bars, one hue, value at the bar's end, detail on hover or focus. */
function BarList({ rows, unit, note }: { rows: Row[]; unit: string; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const [active, setActive] = useState<number | null>(null)
  return (
    <div>
      <ul className="flex flex-col gap-[7px]">
        {rows.map((r, i) => (
          <li
            key={r.label}
            tabIndex={0}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group grid grid-cols-[minmax(0,42%)_1fr_auto] items-center gap-3 rounded outline-none"
          >
            <span className={`truncate text-[12.5px] ${active === i ? 'text-ink' : 'text-ink-2'}`}>{r.label}</span>
            <span className="h-2 rounded-e-[4px] bg-inset">
              <span
                className={`block h-full rounded-e-[4px] transition-colors ${active === i ? 'bg-accent-strong' : 'bg-accent'}`}
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
              />
            </span>
            <span className="tnum w-9 text-end font-mono text-[12px] text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 h-8 text-[12px] leading-snug text-ink-3" aria-live="polite">
        {active === null ? `Bars show ${unit}. ${note ?? 'Point at one for detail.'}` : `${rows[active].label}: ${rows[active].value}. ${rows[active].detail}.`}
      </p>
    </div>
  )
}

// ---- The visitor's own note ------------------------------------------------

const W = 520
const H = 300
const PAD = { l: 30, r: 96, t: 12, b: 28 }

/** Change over passes: two step lines on one axis (both are counts of questions), direct labels at the ends, crosshair on hover. */
function CompletenessTrace({ trace }: { trace: TracePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const pts = trace.length === 1 ? [trace[0], trace[0]] : trace
  const geom = useMemo(() => {
    const n = Math.max(2, pts.length)
    const maxY = Math.max(10, ...pts.map((p) => Math.max(p.answered, p.owed)))
    const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r)
    const y = (v: number) => PAD.t + (1 - v / maxY) * (H - PAD.t - PAD.b)
    const step = (key: keyof TracePoint) => pts.map((p, i) => (i === 0 ? `M${x(0)},${y(p[key])}` : `H${x(i)}V${y(p[key])}`)).join('')
    const ticks = [0, Math.round(maxY / 2), maxY]
    return { x, y, step, ticks, n }
  }, [pts])

  if (trace.length === 0) {
    return (
      <div className="grid h-[300px] place-items-center rounded-md border border-dashed border-line-2 px-6 text-center text-[13px] leading-relaxed text-ink-3">
        Write in the demo above, or press “Try an example”. This chart draws itself from your note.
      </div>
    )
  }

  const last = pts[pts.length - 1]
  const shown = hover === null ? last : pts[hover]
  // Keep the two end labels from sitting on top of each other.
  let ya = geom.y(last.answered)
  let yo = geom.y(last.owed)
  if (Math.abs(ya - yo) < 14) {
    const mid = (ya + yo) / 2
    ya = mid + (ya >= yo ? 7 : -7)
    yo = mid + (ya >= yo ? -7 : 7)
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" />Answered <b className="tnum font-semibold text-ink">{shown.answered}</b></span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" />Still owed <b className="tnum font-semibold text-ink">{shown.owed}</b></span>
        <span className="ms-auto text-ink-3">{hover === null ? `${trace.length} changes so far` : `change ${hover + 1} of ${trace.length}`}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Questions answered and still owed as the note was written. Now ${last.answered} answered and ${last.owed} still owed.`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (geom.n - 1))
          setHover(Math.min(pts.length - 1, Math.max(0, i)))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {geom.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={geom.y(t)} y2={geom.y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.l - 8} y={geom.y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-3)" className="tnum font-mono">{t}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fontSize="11" fill="var(--color-ink-3)">first words</text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="11" fill="var(--color-ink-3)">now</text>

        <path d={geom.step('owed')} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
        <path d={geom.step('answered')} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />

        {hover !== null && (
          <g>
            <line x1={geom.x(hover)} x2={geom.x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-3)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={geom.x(hover)} cy={geom.y(pts[hover].owed)} r="4.5" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
            <circle cx={geom.x(hover)} cy={geom.y(pts[hover].answered)} r="4.5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
          </g>
        )}

        <circle cx={geom.x(geom.n - 1)} cy={geom.y(last.owed)} r="4" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
        <circle cx={geom.x(geom.n - 1)} cy={geom.y(last.answered)} r="4" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
        <text x={W - PAD.r + 10} y={yo + 4} fontSize="12" fill="var(--color-ink-2)">{last.owed} still owed</text>
        <text x={W - PAD.r + 10} y={ya + 4} fontSize="12" fill="var(--color-ink-2)">{last.answered} answered</text>
      </svg>
    </div>
  )
}
