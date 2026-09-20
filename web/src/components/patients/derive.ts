import type { Bundle, Encounter, Item } from '@/lib/types'
import type { SparkPoint } from '@/components/charts/Sparkline'
import { formatDate } from '@/components/charts/format'

export type ProblemEntry = { bundle: Bundle; firstSeen: string; lastSeen: string }
export type TrendEntry = { fieldKey: string; label: string; unit?: string; points: SparkPoint[] }

/**
 * The problem list: bundles opened across the patient's encounters, with
 * when each was first and last seen. Bundles with `trigger: null` are
 * "always on" core documentation (vitals, op-core team/timing) rather than a
 * clinical finding, so they're excluded here — a judgment call, not in the
 * contract.
 */
export function deriveProblems(encounters: Encounter[], bundles: Bundle[]): ProblemEntry[] {
  const byId = new Map(bundles.map((b) => [b.id, b]))
  const seen = new Map<string, { first: string; last: string }>()
  const sorted = [...encounters].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const enc of sorted) {
    for (const bundleId of enc.openBundles) {
      const bundle = byId.get(bundleId)
      // Operative bundles describe an operation, not the patient: a drain is not a problem.
      if (!bundle || bundle.trigger === null || bundle.kind.startsWith('op-')) continue
      const entry = seen.get(bundleId)
      if (!entry) seen.set(bundleId, { first: enc.createdAt, last: enc.createdAt })
      else entry.last = enc.createdAt
    }
  }

  return [...seen.entries()]
    .map(([id, { first, last }]) => ({ bundle: byId.get(id)!, firstSeen: first, lastSeen: last }))
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
}

function parseValue(type: Item['type'], value: string): number | null {
  if (type === 'bp') {
    const m = value.match(/(\d+)\s*\/\s*\d+/)
    return m ? Number(m[1]) : null
  }
  const m = value.match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

/**
 * A trend per field whose item type is `bp` or starts with `number`, for
 * every field that recurs (a value in two or more encounters) — a single
 * reading isn't a trend. BP plots the systolic reading but displays the full
 * "130/85" reading in the tooltip and last-value label.
 */
export function deriveTrends(encounters: Encounter[], bundles: Bundle[]): TrendEntry[] {
  const items = new Map<string, { bundle: Bundle; item: Item }>()
  for (const bundle of bundles) for (const item of bundle.items) items.set(`${bundle.id}.${item.id}`, { bundle, item })

  const sorted = [...encounters].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const byField = new Map<string, TrendEntry>()

  for (const enc of sorted) {
    for (const [fieldKey, entry] of Object.entries(enc.sheet)) {
      if (!entry.value) continue
      const found = items.get(fieldKey)
      if (!found) continue
      const { item } = found
      if (item.type !== 'bp' && !item.type.startsWith('number')) continue
      const value = parseValue(item.type, entry.value)
      if (value == null) continue
      const unit = entry.unit ?? (item.type.startsWith('number ') ? item.type.slice('number '.length) : undefined)
      if (!byField.has(fieldKey)) byField.set(fieldKey, { fieldKey, label: item.label, unit, points: [] })
      byField.get(fieldKey)!.points.push({
        label: formatDate(enc.createdAt),
        value,
        display: item.type === 'bp' ? entry.value ?? undefined : undefined,
      })
    }
  }

  return [...byField.values()].filter((t) => t.points.length >= 2)
}
