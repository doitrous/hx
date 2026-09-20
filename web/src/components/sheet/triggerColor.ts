import type { CSSProperties } from 'react'

/**
 * Hues for "this is what the note said that opened this set". Mid-tone so the
 * same value reads on paper and on the dark surface; crimson and the accent
 * blue are left out because they already mean owed and answered.
 */
const HUES = ['#0d9488', '#d97706', '#7c3aed', '#16a34a', '#0284c7', '#ea580c', '#c026d3', '#65a30d']

export type TriggerMark = { start: number; end: number; hue: string }

/** A wash plus an underline. No padding or border, so marked text keeps the exact metrics of the textarea above it. */
export function triggerStyle(hue: string): CSSProperties {
  return { backgroundColor: `color-mix(in oklab, ${hue} 20%, transparent)`, boxShadow: `inset 0 -2px 0 ${hue}`, color: 'inherit', borderRadius: 2 }
}

/**
 * One hue per caught phrase, in the order the phrases appear in the note, so
 * every set that "hernia" opened shares hernia's colour with the word itself.
 */
export function colourTriggers(text: string, triggers: Record<string, { phrase: string; at: number }>, openIds: string[]) {
  const found = new Map<string, number>()
  for (const id of openIds) {
    const t = triggers[id]
    if (!t || found.has(t.phrase)) continue
    // Where it was caught if the words are still there, otherwise wherever they moved to. Edited away: no mark.
    const at = text.startsWith(t.phrase, t.at) ? t.at : text.indexOf(t.phrase)
    if (at >= 0) found.set(t.phrase, at)
  }
  // A phrase caught inside a longer caught phrase ("bleeding" within "brisk bleeding") joins the longer
  // one: one mark, one colour, and every set either of them opened wears it.
  const spans = [...found].map(([phrase, start]) => ({ phrase, start, end: start + phrase.length }))
  const outer = spans.filter((s) => !spans.some((o) => o !== s && o.start <= s.start && o.end >= s.end && o.end - o.start > s.end - s.start)).sort((x, y) => x.start - y.start)
  const hueOf = new Map<string, string>()
  outer.forEach((o, i) => {
    for (const s of spans) if (s.start >= o.start && s.end <= o.end && !hueOf.has(s.phrase)) hueOf.set(s.phrase, HUES[i % HUES.length])
  })
  const marks: TriggerMark[] = outer.map((o) => ({ start: o.start, end: o.end, hue: hueOf.get(o.phrase)! }))
  const byBundle: Record<string, { hue: string; phrase: string }> = {}
  for (const id of openIds) {
    const hue = hueOf.get(triggers[id]?.phrase)
    if (hue) byBundle[id] = { hue, phrase: triggers[id].phrase }
  }
  return { marks, byBundle }
}
