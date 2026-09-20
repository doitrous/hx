const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The one date format used throughout: "20 Sep 2026" (non-US, unambiguous — see the research brief). */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Default numeric formatter for chart values: integers plain, else one decimal. */
export function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
