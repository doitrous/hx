// Every type here is transcribed exactly from docs/CONTRACT.md — the contract
// between vault, server and web. Do not add fields the contract does not
// have; do not rename a field to match a UI convenience. If the contract
// changes, this file changes first.

// ---- bundles.json (compiled, read-only) -----------------------------------

export type Bundles = { version: string; bundles: Bundle[] }

export type Bundle = {
  id: string
  title: string
  kind: 'history' | 'exam' | 'op-core' | 'op-event' | 'op-procedure'
  system: string
  trigger: string | null // null = always on
  about: string
  /** draft: just written. checked: machine-reviewed. reviewed: signed off by the doctor. */
  status: 'draft' | 'checked' | 'reviewed'
  items: Item[]
}

export type Item = {
  id: string
  label: string
  phrase: string
  type: 'text' | 'presence' | 'duration' | 'bp' | `number ${string}` | 'number'
  link?: string // link = target bundle id: this item is a connection
  reason?: string
}

// A field on the record sheet is addressed as "<bundleId>.<itemId>" (a "field key").
export type FieldKey = string

// ---- The analysis call (the heart of the product) --------------------------

export type AnalyzeRequest = {
  mode: 'clinical' | 'operative' // clinical = history + exam bundles, operative = op-* bundles
  text: string // the note. Server scrubs the patient's stored name before Jev sees it.
  open: string[] // bundle ids currently open on the client
  locked: string[] // field keys the doctor edited or dismissed: never re-asked
  known?: Record<string, string> // field key -> evidence sentence from the last response.
  patientId?: string // product only, used for name scrubbing
  prevHash?: string // clausesHash from the last successful response — lets the server skip settled questions
}

export type AnalyzeResponse = {
  // Every triggered bundle with its probability. `trigger` is the span of the note that opened it, sent once, when it opens.
  bundles: { id: string; p: number; open: boolean; trigger?: { start: number; end: number } }[]
  fields: Record<FieldKey, Field> // every item of every open bundle
  usage: { tokens: number; calls: number }
  ms: number
  bundlesVersion: string
  clausesHash: string // echoed back as prevHash on the next request
}

export type Field = {
  p: number // probability the note documents it
  state: 'filled' | 'unclear' | 'empty' // p >= 0.7, 0.4..0.7, < 0.4 (thresholds in one server config)
  value: string | null
  unit?: string
  evidence: { start: number; end: number } | null // character span in `text`
}

// ---- Records API (product, session cookie) ---------------------------------

export type Sheet = Record<
  FieldKey,
  {
    value: string | null
    unit?: string
    state: Field['state'] | 'dismissed'
    source: 'jev' | 'doctor'
    p?: number
    evidence?: { start: number; end: number } | null
  }
>

export type Encounter = {
  id: string
  patientId: string
  mode: 'clinical' | 'operative'
  title: string
  text: string
  sheet: Sheet
  openBundles: string[]
  status: 'draft' | 'final'
  bundlesVersion: string
  createdAt: string
  updatedAt: string
  finalizedAt?: string
}

export type Patient = {
  id: string
  mrn: string
  name?: string
  sex?: 'M' | 'F'
  birthYear?: number
  createdAt: string
  lastEncounterAt?: string
  openDrafts: number
  completeness?: number // 0..1 of last encounter
}

export type DashboardStats = {
  patients: number
  encountersThisWeek: number
  openDrafts: number
  avgCompleteness: number
  completenessByWeek: { week: string; value: number }[]
  mostMissed: { fieldKey: string; label: string; bundleTitle: string; missedRate: number; n: number }[]
  bySystem: { system: string; encounters: number }[]
}

// ---- Auth / misc -------------------------------------------------------------

export type Doctor = { id: string; email: string; name: string }

export type ApiErrorBody = { error: string }
