import { useState } from 'react'
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
          {bundles ? <CellBars rows={bySystem(bundles).slice(0, 11)} hint="Each block is one question set, sized by its questions." note={tailNote(bySystem(bundles), 11)} /> : <Placeholder />}
        </Panel>
        <Panel title="What most conditions lead to" takeaway="The question sets that the most other sets open as a follow-up.">
          {bundles ? <CellBars rows={mostConnected(bundles)} hint="Each block is one set that leads here." /> : <Placeholder />}
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

type Cell = { label: string; weight: number; detail: string }
type Row = { label: string; value: number; cells: Cell[] }

function bySystem(bundles: Bundle[]): Row[] {
  const map = new Map<string, Row>()
  for (const b of bundles) {
    const row = map.get(b.system) ?? { label: b.system, value: 0, cells: [] }
    row.value += b.items.length
    row.cells.push({ label: displayTitle(b.title), weight: b.items.length, detail: `${b.items.length} questions` })
    map.set(b.system, row)
  }
  for (const row of map.values()) row.cells.sort((a, b) => b.weight - a.weight)
  return [...map.values()].sort((a, b) => b.value - a.value)
}

/** A lumped "other" bar would be the longest on the chart and wreck the scale, so the tail is a sentence instead. */
function tailNote(rows: Row[], shown: number) {
  const rest = rows.slice(shown)
  return rest.length ? `Plus ${rest.reduce((n, r) => n + r.value, 0).toLocaleString('en')} questions across ${rest.length} smaller areas.` : ''
}

function mostConnected(bundles: Bundle[]): Row[] {
  const byId = new Map(bundles.map((b) => [b.id, b]))
  const incoming = new Map<string, Cell[]>()
  for (const b of bundles)
    for (const item of b.items)
      if (item.link && item.link !== b.id)
        incoming.set(item.link, [...(incoming.get(item.link) ?? []), { label: displayTitle(b.title), weight: 1, detail: `asks “${item.label}”` }])
  return [...incoming]
    .map(([id, cells]) => ({ label: displayTitle(byId.get(id)?.title ?? id), value: cells.length, cells }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 11)
}

/**
 * Magnitude across categories, drawn as runs of small square-cornered blocks
 * instead of one solid bar, so every block is something you can point at.
 * Pointing at a block names it; the other rows step back.
 */
function CellBars({ rows, hint, note }: { rows: Row[]; hint: string; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const [active, setActive] = useState<{ row: number; cell: number | null } | null>(null)
  const row = active ? rows[active.row] : null
  const cell = row && active?.cell != null ? row.cells[active.cell] : null
  return (
    <div onMouseLeave={() => setActive(null)}>
      <ul className="flex flex-col gap-[9px]">
        {rows.map((r, i) => (
          <li
            key={r.label}
            tabIndex={0}
            onMouseEnter={() => setActive((cur) => (cur?.row === i ? cur : { row: i, cell: null }))}
            onFocus={() => setActive({ row: i, cell: null })}
            onBlur={() => setActive(null)}
            className={`grid grid-cols-[minmax(0,38%)_1fr_auto] items-center gap-3 rounded-sm outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-accent/40 ${active && active.row !== i ? 'opacity-35' : ''}`}
          >
            <span className={`truncate text-[12.5px] ${active?.row === i ? 'font-medium text-ink' : 'text-ink-2'}`}>{r.label}</span>
            <span className="flex h-3.5 gap-[2px]" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }}>
              {r.cells.map((c, j) => (
                <span
                  key={j}
                  onMouseEnter={() => setActive({ row: i, cell: j })}
                  onClick={() => setActive({ row: i, cell: j })}
                  style={{ flexGrow: c.weight, animationDelay: `${i * 30 + j * 12}ms` }}
                  className={`cn-cell h-full min-w-[2px] basis-0 rounded-[1px] transition-[background-color,transform] duration-100 ${
                    active?.row === i && active.cell === j ? 'scale-y-[1.35] bg-primary' : active?.row === i ? 'bg-accent-strong' : 'bg-accent'
                  }`}
                />
              ))}
            </span>
            <span className="tnum w-9 text-end font-mono text-[12px] text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3.5 min-h-[34px] text-[12px] leading-snug text-ink-3" aria-live="polite">
        {cell && row ? (
          <><b className="font-semibold text-ink">{cell.label}</b> · {cell.detail}</>
        ) : row ? (
          <><b className="font-semibold text-ink">{row.label}</b> · {row.value} across {row.cells.length} blocks. Point at a block.</>
        ) : (
          `${hint} ${note ?? ''}`
        )}
      </p>
      <style>{`@keyframes cn-cell-in{from{opacity:0;transform:scaleY(.2)}to{opacity:1;transform:none}}.cn-cell{animation:cn-cell-in .35s ease-out both}@media (prefers-reduced-motion:reduce){.cn-cell{animation:none}}`}</style>
    </div>
  )
}

// ---- The visitor's own note ------------------------------------------------

const W = 520
const H = 300
const PAD = { l: 30, r: 8, t: 14, b: 14 }
const LABEL_W = 92

/**
 * Change over passes as a run of thin columns on one axis (both are counts of
 * questions): answered rises above the line, still owed hangs below it.
 */
function CompletenessTrace({ trace }: { trace: TracePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (trace.length === 0) {
    return (
      <div className="grid h-[300px] place-items-center rounded-md border border-dashed border-line-2 px-6 text-center text-[13px] leading-relaxed text-ink-3">
        Write in the demo above, or press “Try an example”. This chart draws itself from your note.
      </div>
    )
  }

  const n = trace.length
  const maxY = Math.max(10, ...trace.map((p) => Math.max(p.answered, p.owed)))
  const plotW = W - PAD.l - PAD.r - LABEL_W
  const stepX = Math.min(20, plotW / n)
  const bw = Math.max(1.5, stepX - 2)
  const mid = (PAD.t + H - PAD.b) / 2
  const half = mid - PAD.t
  const hgt = (v: number) => (v / maxY) * half
  const x = (i: number) => PAD.l + i * stepX
  const last = trace[n - 1]
  const shown = hover === null ? last : trace[hover]
  const labelX = x(n - 1) + bw + 8

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[1px] bg-accent" />Answered <b className="tnum font-semibold text-ink">{shown.answered}</b></span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[1px] bg-primary" />Still owed <b className="tnum font-semibold text-ink">{shown.owed}</b></span>
        <span className="ms-auto text-ink-3">{hover === null ? `${n} changes so far` : `change ${hover + 1} of ${n}`}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Questions answered and still owed as the note was written. Now ${last.answered} answered and ${last.owed} still owed.`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          setHover(Math.min(n - 1, Math.max(0, Math.floor((px - PAD.l) / stepX))))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[maxY, 0, -maxY].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={mid - hgt(t)} y2={mid - hgt(t)} stroke={t === 0 ? 'var(--color-line-2)' : 'var(--color-line)'} strokeWidth="1" />
            <text x={PAD.l - 8} y={mid - hgt(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-3)" className="tnum font-mono">{Math.abs(t)}</text>
          </g>
        ))}
        {hover !== null && <rect x={x(hover) - 1} y={PAD.t} width={bw + 2} height={H - PAD.t - PAD.b} fill="var(--color-inset)" />}
        {trace.map((p, i) => {
          const dim = hover !== null && hover !== i ? 0.35 : 1
          return (
            <g key={i} opacity={dim} style={{ transition: 'opacity .12s' }}>
              <rect x={x(i)} y={mid - 1 - hgt(p.answered)} width={bw} height={Math.max(0, hgt(p.answered))} fill="var(--color-accent)" />
              <rect x={x(i)} y={mid + 1} width={bw} height={Math.max(0, hgt(p.owed))} fill="var(--color-primary)" />
            </g>
          )
        })}
        <text x={labelX} y={mid - 8} fontSize="12" fill="var(--color-ink-2)">{last.answered} answered</text>
        <text x={labelX} y={mid + 18} fontSize="12" fill="var(--color-ink-2)">{last.owed} still owed</text>
      </svg>
    </div>
  )
}
