import type { Bundle, Item } from '@/lib/types'

export type ParentLink = { bundle: Bundle; item: Item }

/**
 * A bundle nests directly beneath the first open bundle whose item links to
 * it (Display research brief §5: "nested/threaded list with an inline
 * reason" — a link in the vault is a directed, reason-labelled edge). Any
 * further open parents are listed as `parents.slice(1)` chips.
 */
export type BundleNode = {
  bundle: Bundle
  parents: ParentLink[]
  children: BundleNode[]
}

/** `openBundleIds` in catalogue order — dedupes and drops ids the catalogue no longer has. */
export function orderedOpenBundles(openBundleIds: string[], allBundles: Bundle[]): Bundle[] {
  const byId = new Map(allBundles.map((b) => [b.id, b]))
  const seen = new Set<string>()
  const out: Bundle[] = []
  for (const id of openBundleIds) {
    const b = byId.get(id)
    if (b && !seen.has(id)) {
      seen.add(id)
      out.push(b)
    }
  }
  return out
}

/** Builds the "opened because" forest. Order is preserved from `openBundles` (chronological — the order bundles actually opened). */
export function buildBundleForest(openBundles: Bundle[]): BundleNode[] {
  const nodes = new Map<string, BundleNode>()
  for (const b of openBundles) nodes.set(b.id, { bundle: b, parents: [], children: [] })

  for (const parentBundle of openBundles) {
    for (const item of parentBundle.items) {
      if (!item.link || item.link === parentBundle.id) continue
      const child = nodes.get(item.link)
      if (child) child.parents.push({ bundle: parentBundle, item })
    }
  }

  const roots: BundleNode[] = []
  const attached = new Set<string>()

  for (const node of nodes.values()) {
    if (node.parents.length === 0) roots.push(node)
  }
  for (const node of nodes.values()) {
    if (node.parents.length === 0) continue
    const parentNode = nodes.get(node.parents[0].bundle.id)
    if (parentNode) {
      parentNode.children.push(node)
      attached.add(node.bundle.id)
    }
  }
  // Safety net for a link cycle (compiler is meant to forbid these, but a
  // node that ends up with neither a root slot nor an attachment must not
  // silently vanish from the sheet).
  for (const node of nodes.values()) {
    if (node.parents.length > 0 && !attached.has(node.bundle.id) && !roots.includes(node)) roots.push(node)
  }
  return roots
}

export const SUPERSECTIONS: Record<'clinical' | 'operative', { title: string; kinds: Bundle['kind'][] }[]> = {
  clinical: [
    { title: 'History', kinds: ['history'] },
    { title: 'Examination', kinds: ['exam'] },
  ],
  operative: [
    { title: 'Core', kinds: ['op-core'] },
    { title: 'Procedure', kinds: ['op-procedure'] },
    { title: 'Events', kinds: ['op-event'] },
  ],
}

/** Groups top-level forest nodes into named super-sections, in the note's own trigger order (never alphabetical). */
export function groupForest(mode: 'clinical' | 'operative', forest: BundleNode[]) {
  return SUPERSECTIONS[mode].map((section) => ({
    title: section.title,
    nodes: forest.filter((n) => section.kinds.includes(n.bundle.kind)),
  }))
}

export function flattenForest(nodes: BundleNode[]): BundleNode[] {
  const out: BundleNode[] = []
  for (const node of nodes) {
    out.push(node)
    out.push(...flattenForest(node.children))
  }
  return out
}

function countItems(bundle: Bundle, sheet: Record<string, { state: string } | undefined>) {
  let filled = 0
  let unclear = 0
  let empty = 0
  for (const item of bundle.items) {
    const entry = sheet[`${bundle.id}.${item.id}`]
    if (entry?.state === 'filled') filled++
    else if (entry?.state === 'unclear') unclear++
    else if (entry?.state !== 'dismissed') empty++
  }
  return { filled, unclear, empty, total: bundle.items.length }
}

export function countBundleItems(node: BundleNode, sheet: Record<string, { state: string } | undefined>) {
  return countItems(node.bundle, sheet)
}

/** Whole-sheet totals across every open bundle, for the header instrument. */
export function aggregateCounts(openBundles: Bundle[], sheet: Record<string, { state: string } | undefined>) {
  let filled = 0
  let unclear = 0
  let empty = 0
  for (const bundle of openBundles) {
    const c = countItems(bundle, sheet)
    filled += c.filled
    unclear += c.unclear
    empty += c.empty
  }
  return { filled, unclear, empty, total: filled + unclear + empty }
}

/** Vault notes carry a filing prefix ("Op - Core - ", "Neuro - "). Readers of the sheet do not need it. */
export function displayTitle(title: string): string {
  const t = title.replace(/^(Op - Core|Op|Neuro|Rheum|Abdominal|Vascular|Breast|Renal|Heme|Gyn|General surgery) - /, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
