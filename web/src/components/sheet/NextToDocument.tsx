import type { Bundle, Sheet } from '@/lib/types'

/**
 * A passive strip, never a popup: at most five empty fields, drawn from the
 * most recently opened bundle first (Display research brief §1 — tailor and
 * cap what's shown, never a generic superset). Clicking scrolls to and
 * pulses the blank; it never scrolls on its own.
 */
export function NextToDocument({
  openBundles,
  sheet,
  onJumpTo,
}: {
  /** Chronological, oldest first — the tail is "most recently opened". */
  openBundles: Bundle[]
  sheet: Sheet
  onJumpTo: (fieldKey: string) => void
}) {
  const items: { key: string; label: string }[] = []
  for (let i = openBundles.length - 1; i >= 0 && items.length < 5; i--) {
    const bundle = openBundles[i]
    for (const item of bundle.items) {
      if (items.length >= 5) break
      const key = `${bundle.id}.${item.id}`
      const state = sheet[key]?.state
      if (!state || state === 'empty') items.push({ key, label: item.label })
    }
  }

  if (!items.length) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Next to document</span>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onJumpTo(it.key)}
          className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-primary-line hover:text-primary-strong"
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
          {it.label}
        </button>
      ))}
    </div>
  )
}
