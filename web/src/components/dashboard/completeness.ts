import type { Bundle, Sheet } from '@/lib/types'

function isResolved(entry: Sheet[string] | undefined): boolean {
  return entry != null && (entry.state === 'filled' || entry.state === 'dismissed' || (entry.value != null && entry.value !== ''))
}

/**
 * Fraction of fields resolved across an encounter's open bundles, derived
 * client-side from Sheet + openBundles + the bundle catalogue.
 *
 * Contract gap: `Encounter` (docs/CONTRACT.md) carries no completeness field
 * of its own — only `Patient.completeness` ("of last encounter") exists. This
 * recomputes the same idea per-encounter so the dashboard's open-drafts list
 * and the patient record's timeline can show it, but it means the "what counts
 * as complete" rule now lives in two places (here, and wherever the server
 * derives `Patient.completeness`). Worth unifying behind one API field.
 */
export function encounterCompleteness(sheet: Sheet, openBundles: string[], bundles: Bundle[]): number {
  const open = bundles.filter((b) => openBundles.includes(b.id))
  const total = open.reduce((n, b) => n + b.items.length, 0)
  if (total === 0) return 0
  const filled = open.reduce((n, b) => n + b.items.filter((item) => isResolved(sheet[`${b.id}.${item.id}`])).length, 0)
  return filled / total
}
