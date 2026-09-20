/**
 * The categorical system palette.
 *
 * Medium-chroma, evenly spaced around the hue wheel (hsl 15deg -> 325deg in
 * even steps, alternating saturation/lightness for extra separation between
 * neighbours), and deliberately kept out of the 330-360deg band the brand
 * reserves for crimson (--color-primary) and danger — so a system colour is
 * never mistaken for "act on this" or "this failed".
 *
 * Used ONLY on a 3px spine (SystemChip) or a legend dot — never as a fill,
 * and never the sole way a system is identified: the name is always printed
 * beside it. Colours are fixed values (not theme tokens) because they carry
 * identity, not chrome, and read the same in light and dark.
 */
export const SYSTEM_COLORS: Record<string, string> = {
  General: '#9e4a2e',
  Abdominal: '#b8772e',
  Chest: '#a89024',
  Cardiac: '#a3b234',
  Renal: '#72a329',
  Endocrine: '#57bd28',
  Neurology: '#329e2e',
  Rheumatology: '#2eb853',
  Hematology: '#24a86d',
  Lymphatic: '#34b29d',
  Gynecology: '#2995a3',
  'General surgery': '#2882bd',
  Breast: '#2e509e',
  Vascular: '#2e30b8',
  'Head and neck': '#4724a8',
  'Peripheral nerves': '#7934b2',
  Orthopedics: '#9129a3',
  Endoscopy: '#bd28a9',
  Operative: '#9e2e6f',
}

/** Neutral spine colour for a system not in the catalogue above. */
export const FALLBACK_SYSTEM_COLOR = '#6b7280'

export function systemColor(system: string): string {
  return SYSTEM_COLORS[system] ?? FALLBACK_SYSTEM_COLOR
}

export const SYSTEM_NAMES = Object.keys(SYSTEM_COLORS)
