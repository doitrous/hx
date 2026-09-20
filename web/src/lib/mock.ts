// Served instead of api.ts when VITE_MOCK=1 (see client.ts), so screens can be
// built before the server exists. Same shape as `api`, same errors (ApiError),
// backed by in-memory fixtures instead of fetch.
import { ApiError } from './api'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Bundle,
  Bundles,
  DashboardStats,
  Doctor,
  Encounter,
  Field,
  Patient,
  Sheet,
} from './types'

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function notFound(what: string): never {
  throw new ApiError(404, `${what} not found`)
}

// ---- bundles.json excerpt ---------------------------------------------------
// A handful of real bundles from server/bundles.json, spanning every `kind`,
// small enough to read at a glance. The full 158-bundle set is the server's
// concern; the mock only needs enough shape for a screen to render against.
const MOCK_BUNDLES: Bundle[] = [
  {
    id: 'family',
    title: 'Family history',
    kind: 'history',
    system: 'General',
    trigger: null,
    about: "the patient's family history",
    status: 'reviewed',
    items: [
      { id: 'consanguinity', label: 'Consanguinity', phrase: 'parental consanguinity', type: 'text' },
      { id: 'similar_condition', label: 'Similar condition', phrase: 'whether a family member has a similar condition', type: 'text' },
      { id: 'htn_dm_tb_ihd', label: 'HTN, DM, TB, IHD', phrase: 'hypertension, diabetes, TB or heart disease in the family', type: 'text' },
    ],
  },
  {
    id: 'pain',
    title: 'Pain',
    kind: 'history',
    system: 'General',
    trigger: 'The patient complains of pain anywhere in the body',
    about: "the patient's pain",
    status: 'reviewed',
    items: [
      { id: 'site', label: 'Site', phrase: 'the site of the pain', type: 'text' },
      { id: 'character', label: 'Character', phrase: 'the character of the pain, such as burning, colicky, stabbing or dull', type: 'text' },
      { id: 'severity', label: 'Severity', phrase: 'the severity of the pain', type: 'text' },
      {
        id: 'radiation',
        label: 'Radiation',
        phrase: 'whether or where the pain radiates',
        type: 'text',
        link: 'x_nerve_median',
        reason: 'radiating limb pain warrants a peripheral nerve exam',
      },
    ],
  },
  {
    id: 'abdo_ascites',
    title: 'Abdominal - ascites and swelling',
    kind: 'history',
    system: 'Abdominal',
    trigger: 'The patient has abdominal distension, a swelling or ascites',
    about: "the patient's abdominal swelling",
    status: 'draft',
    items: [
      { id: 'distribution', label: 'Distribution', phrase: 'whether the swelling is localized to a site or diffuse (generalized distension)', type: 'text' },
      { id: 'paracentesis_aspiration', label: 'Paracentesis / aspiration', phrase: 'a previous paracentesis or aspiration, or its absence', type: 'presence' },
      { id: 'fluid_amount', label: 'Fluid amount', phrase: 'the amount of fluid aspirated', type: 'text' },
      { id: 'fluid_appearance', label: 'Fluid appearance', phrase: 'the aspect or color of the aspirated fluid', type: 'text' },
      {
        id: 'aspiration_complications',
        label: 'Aspiration complications',
        phrase: 'a complication of aspiration or its absence',
        type: 'presence',
        link: 'op_anaesthetic_event',
        reason: 'a haemodynamic complication of large-volume paracentesis is logged as an event',
      },
    ],
  },
  {
    id: 'x_nerve_median',
    title: 'Median nerve tests examination',
    kind: 'exam',
    system: 'Peripheral nerves',
    trigger: 'The patient has a peripheral nerve injury or a hand or foot deformity from nerve damage',
    about: 'the special tests of the median nerve',
    status: 'draft',
    items: [
      { id: "ochsner_s_clasping_test", label: "Ochsner's clasping test", phrase: "Ochsner's clasping test", type: 'text' },
      { id: 'pen_touching_test', label: 'Pen touching test', phrase: 'the pen touching test for abductor pollicis brevis', type: 'text' },
      { id: 'thumb_opposition', label: 'Thumb opposition', phrase: 'opposition of the thumb against the other fingers', type: 'text' },
      { id: 'benediction_attitude', label: 'Benediction attitude', phrase: 'the benediction attitude, or its absence', type: 'presence' },
    ],
  },
  {
    id: 'op_core_team',
    title: 'Op - Core - Team and timing',
    kind: 'op-core',
    system: 'Operative',
    trigger: null,
    about: "the operation's team and timing",
    status: 'draft',
    items: [
      { id: 'date_and_time', label: 'Date and time', phrase: 'the date and time of the operation', type: 'text' },
      { id: 'elective_or_emergency', label: 'Elective or emergency', phrase: 'whether the operation was elective or an emergency', type: 'text' },
      { id: 'surgeon', label: 'Surgeon', phrase: 'the operating surgeon', type: 'text' },
      { id: 'anaesthesia_type', label: 'Anaesthesia type', phrase: 'the type of anaesthesia used (general, regional, local, sedation)', type: 'text' },
    ],
  },
  {
    id: 'op_anaesthetic_event',
    title: 'Op - Cardiorespiratory event',
    kind: 'op-event',
    system: 'Operative',
    trigger: 'A significant cardiorespiratory event such as hypotension, desaturation or arrest occurred during this operation',
    about: 'an intraoperative cardiorespiratory event',
    status: 'draft',
    items: [
      { id: 'type', label: 'Type', phrase: 'the type of event (e.g. hypotension, desaturation, arrhythmia, arrest)', type: 'text' },
      { id: 'management', label: 'Management', phrase: 'how the event was managed', type: 'text' },
      { id: 'response_documented', label: 'Response documented', phrase: 'the anaesthetist / team response was documented, or its absence', type: 'presence' },
    ],
  },
  {
    id: 'op_av_fistula_creation',
    title: 'AV fistula creation',
    kind: 'op-procedure',
    system: 'Vascular',
    trigger: 'The operation performed in this note was creation of an arteriovenous fistula for dialysis access',
    about: 'the AV fistula creation performed',
    status: 'draft',
    items: [
      { id: 'site', label: 'Site', phrase: 'the site of the fistula, such as radiocephalic or brachiocephalic', type: 'text' },
      { id: 'anastomosis_type', label: 'Anastomosis type', phrase: 'the type of anastomosis fashioned, such as end-to-side', type: 'text' },
      { id: 'thrill_present', label: 'Thrill present', phrase: 'a palpable thrill or audible bruit confirmed after fistula creation, or its absence', type: 'presence' },
    ],
  },
  // ponytail: not from server/bundles.json — added so the dashboard/patient-record
  // screens have a recurring numeric+bp field to trend (see docs/CONTRACT.md's
  // "trends for every field whose item type starts with number, or bp").
  {
    id: 'vitals',
    title: 'Vitals and basic measurements',
    kind: 'history',
    system: 'Cardiac',
    trigger: null,
    about: "the patient's vital signs and basic measurements",
    status: 'reviewed',
    items: [
      { id: 'blood_pressure', label: 'Blood pressure', phrase: 'the blood pressure', type: 'bp' },
      { id: 'weight', label: 'Weight', phrase: "the patient's weight", type: 'number kg' },
      { id: 'hba1c', label: 'HbA1c', phrase: 'the HbA1c level', type: 'number %' },
    ],
  },
]

const MOCK_BUNDLES_PAYLOAD: Bundles = { version: 'mock-0001', bundles: MOCK_BUNDLES }

// ---- fixtures: 12 synthetic patients ---------------------------------------

type MockPatient = Patient
type MockState = { patients: MockPatient[]; encounters: Record<string, Encounter[]> }

const FIRST = ['Alia', 'Marcus', 'Youssef', 'Elena', 'Tariq', 'Nadia', 'Samuel', 'Priya', 'Karim', 'Lucia', 'Bassem', 'Farah']
const SEXES: Array<'M' | 'F'> = ['F', 'M', 'M', 'F', 'M', 'F', 'M', 'F', 'M', 'F', 'M', 'F']
const SYSTEMS = ['Abdominal', 'Chest', 'Cardiac', 'Renal', 'General surgery', 'Vascular']

function iso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

// ponytail: fixture-only content so the dashboard/patient-record screens have
// believable recurring data (trends, a problem list) without a real Jev pass.
// Every field key below addresses a real item in MOCK_BUNDLES.
const PROBLEM_BUNDLES = ['pain', 'abdo_ascites', 'x_nerve_median']

function seedEncounterContent(i: number, e: number, mode: 'clinical' | 'operative'): { sheet: Sheet; openBundles: string[] } {
  const sheet: Sheet = {}
  const openBundles: string[] = []

  if (mode === 'clinical') {
    openBundles.push('vitals')
    const sys = 108 + ((i * 7 + e * 3) % 34)
    const dia = 66 + ((i * 5 + e * 2) % 18)
    sheet['vitals.blood_pressure'] = { value: `${sys}/${dia}`, state: 'filled', source: e % 2 === 0 ? 'jev' : 'doctor', p: 0.85 }
    const weight = Math.round((62 + (i % 6) * 4 - e * 0.6) * 10) / 10
    sheet['vitals.weight'] = { value: String(weight), unit: 'kg', state: 'filled', source: 'jev', p: 0.82 }
    const hba1c = Math.round((5.9 + (i % 5) * 0.35 - e * 0.15) * 10) / 10
    sheet['vitals.hba1c'] = { value: String(hba1c), unit: '%', state: e === 0 ? 'unclear' : 'filled', source: 'jev', p: e === 0 ? 0.55 : 0.8 }

    const problemId = PROBLEM_BUNDLES[(i + e) % PROBLEM_BUNDLES.length]
    openBundles.push(problemId)
    const problemBundle = MOCK_BUNDLES.find((b) => b.id === problemId)
    problemBundle?.items.forEach((item, idx) => {
      if ((i + e + idx) % 3 === 0) return // leave roughly a third empty — feeds "most missed"
      sheet[`${problemId}.${item.id}`] = {
        value: item.type === 'presence' ? (idx % 2 === 0 ? 'Present' : 'Absent') : 'documented in the note',
        state: 'filled',
        source: idx % 3 === 0 ? 'doctor' : 'jev',
        p: 0.78,
      }
    })
  } else {
    openBundles.push('op_core_team', 'op_anaesthetic_event')
    sheet['op_core_team.surgeon'] = { value: 'Dr. Demo', state: 'filled', source: 'doctor' }
    sheet['op_core_team.elective_or_emergency'] = { value: e % 2 === 0 ? 'Elective' : 'Emergency', state: 'filled', source: 'jev', p: 0.8 }
    sheet['op_anaesthetic_event.type'] = { value: 'transient hypotension responding to fluids', state: 'filled', source: 'jev', p: 0.72 }
    if (i % 2 === 0) {
      sheet['op_anaesthetic_event.management'] = { value: 'managed with a fluid bolus', state: 'filled', source: 'doctor' }
    }
  }

  return { sheet, openBundles }
}

function seedState(): MockState {
  const patients: MockPatient[] = []
  const encounters: Record<string, Encounter[]> = {}

  for (let i = 1; i <= 12; i++) {
    const mrn = `DEMO-${String(i).padStart(4, '0')}`
    const id = `p-${i}`
    const hasDraft = i % 3 === 0
    const encounterCount = (i % 4) + 1
    const list: Encounter[] = []
    for (let e = 0; e < encounterCount; e++) {
      const isLast = e === encounterCount - 1
      const draft = isLast && hasDraft
      const mode = e % 3 === 2 ? 'operative' : 'clinical'
      const { sheet, openBundles } = seedEncounterContent(i, e, mode)
      list.push({
        id: `${id}-e${e + 1}`,
        patientId: id,
        mode,
        title: mode === 'operative' ? 'Operative note' : 'Clinical note',
        text: '',
        sheet,
        openBundles,
        status: draft ? 'draft' : 'final',
        bundlesVersion: MOCK_BUNDLES_PAYLOAD.version,
        createdAt: iso(30 - e * 7 + i),
        updatedAt: iso(30 - e * 7 + i),
        finalizedAt: draft ? undefined : iso(30 - e * 7 + i),
      })
    }
    encounters[id] = list

    patients.push({
      id,
      mrn,
      name: `${FIRST[i - 1]} Patient`,
      sex: SEXES[i - 1],
      birthYear: 1950 + ((i * 7) % 60),
      createdAt: iso(60 + i),
      lastEncounterAt: list.at(-1)?.updatedAt,
      openDrafts: list.filter((e) => e.status === 'draft').length,
      completeness: Math.round((0.35 + ((i * 13) % 60) / 100) * 100) / 100,
    })
  }

  return { patients, encounters }
}

const state = seedState()

function dashboardStats(): DashboardStats {
  const bySystem = SYSTEMS.map((system, i) => ({ system, encounters: 3 + ((i * 5) % 11) }))
  const completenessByWeek = Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    value: Math.round((0.5 + (Math.sin(i) + 1) * 0.2) * 100) / 100,
  }))
  const mostMissed = [
    { fieldKey: 'pain.radiation', label: 'Radiation', bundleTitle: 'Pain', missedRate: 0.42, n: 38 },
    { fieldKey: 'family.consanguinity', label: 'Consanguinity', bundleTitle: 'Family history', missedRate: 0.31, n: 38 },
    { fieldKey: 'abdo_ascites.fluid_appearance', label: 'Fluid appearance', bundleTitle: 'Abdominal - ascites and swelling', missedRate: 0.27, n: 12 },
  ]
  return {
    patients: state.patients.length,
    encountersThisWeek: 9,
    openDrafts: state.patients.reduce((sum, p) => sum + p.openDrafts, 0),
    avgCompleteness:
      Math.round((state.patients.reduce((sum, p) => sum + (p.completeness ?? 0), 0) / state.patients.length) * 100) / 100,
    completenessByWeek,
    mostMissed,
    bySystem,
  }
}

// ---- mock analyze: simple keyword matching ---------------------------------

function findSentence(text: string, index: number): { start: number; end: number } {
  const before = text.lastIndexOf('.', index)
  const after = text.indexOf('.', index)
  const start = before === -1 ? 0 : before + 1
  const end = after === -1 ? text.length : after + 1
  return { start, end }
}

function matchField(text: string, phrase: string, type: string): Field {
  const lower = text.toLowerCase()
  // ponytail: naive OR-of-keywords match, not NLP — the real server hands this
  // to Jev. Good enough to make a screen look alive with realistic-looking data.
  const keywords = phrase
    .toLowerCase()
    .replace(/[(),]/g, '')
    .split(/\s+or\s+|\s+such as\s+|,|\s+/)
    .filter((w) => w.length > 3 && !['whether', 'their', 'absence', 'about'].includes(w))
  let hitIndex = -1
  for (const word of keywords) {
    const idx = lower.indexOf(word)
    if (idx !== -1) {
      hitIndex = idx
      break
    }
  }

  if (hitIndex === -1) {
    return { p: 0.15, state: 'empty', value: null, evidence: null }
  }

  const evidence = findSentence(text, hitIndex)
  const sentence = text.slice(evidence.start, evidence.end).trim()

  if (type === 'presence') {
    const negated = /\bno\b|\bwithout\b|\bdenies\b|\babsent\b/.test(sentence.toLowerCase())
    return { p: 0.82, state: 'filled', value: negated ? 'Absent' : 'Present', evidence }
  }
  if (type === 'bp') {
    const m = sentence.match(/\d{2,3}\/\d{2,3}/)
    return m
      ? { p: 0.85, state: 'filled', value: m[0], evidence }
      : { p: 0.3, state: 'unclear', value: null, evidence }
  }
  if (type === 'duration') {
    const m = sentence.match(/\d+\s*(day|week|month|year)s?/i)
    return m
      ? { p: 0.85, state: 'filled', value: m[0], evidence }
      : { p: 0.3, state: 'unclear', value: null, evidence }
  }
  if (type.startsWith('number')) {
    const m = sentence.match(/\d+(\.\d+)?/)
    return m
      ? { p: 0.85, state: 'filled', value: m[0], unit: type.split(' ')[1], evidence }
      : { p: 0.3, state: 'unclear', value: null, evidence }
  }
  // text — the evidence sentence itself, verbatim
  return { p: 0.75, state: 'filled', value: sentence, evidence }
}

function mockAnalyze(body: AnalyzeRequest): AnalyzeResponse {
  // ponytail: the previous predicate's `||` bound tighter than its `? :`,
  // so it inverted itself (op-* bundles were excluded from operative mode
  // and included in clinical mode). Parenthesized to match what every
  // caller of this function actually needs: candidates scoped to the
  // requested note type, same split useAnalyze.ts uses client-side.
  const candidateBundles = MOCK_BUNDLES.filter((b) =>
    body.mode === 'operative' ? b.kind.startsWith('op') : b.kind === 'history' || b.kind === 'exam',
  )
  const lower = body.text.toLowerCase()
  const bundles = candidateBundles
    .filter((b) => body.open.includes(b.id) || b.trigger === null || lower.includes(b.trigger.toLowerCase().split(' ').slice(-2)[0]))
    .map((b) => ({ id: b.id, p: b.trigger === null ? 1 : 0.7, open: true }))

  const fields: Record<string, Field> = {}
  for (const b of MOCK_BUNDLES) {
    if (!bundles.some((x) => x.id === b.id)) continue
    for (const item of b.items) {
      const key = `${b.id}.${item.id}`
      if (body.locked.includes(key)) continue
      fields[key] = matchField(body.text, item.phrase, item.type)
    }
  }

  return {
    bundles,
    fields,
    usage: { tokens: Math.round(body.text.length * 1.3), calls: 1 },
    ms: 300,
    bundlesVersion: MOCK_BUNDLES_PAYLOAD.version,
    clausesHash: String(body.text.length),
  }
}

// ---- the mock client --------------------------------------------------------

let session: Doctor | null = { id: 'doc-1', email: 'demo@example.com', name: 'Dr. Demo' }

export const mockApi = {
  auth: {
    signup: (body: { email: string; password: string; name: string }) => {
      session = { id: 'doc-1', email: body.email, name: body.name }
      return delay(session)
    },
    login: (body: { email: string; password: string }) => {
      if (!body.email || !body.password) throw new ApiError(401, 'Invalid credentials')
      session = { id: 'doc-1', email: body.email, name: 'Dr. Demo' }
      return delay(session)
    },
    logout: () => {
      session = null
      return delay(undefined)
    },
  },
  me: () => (session ? delay(session) : Promise.reject(new ApiError(401, 'Not signed in'))),

  patients: {
    list: (q?: string) => {
      const rows = q
        ? state.patients.filter((p) => p.mrn.toLowerCase().includes(q.toLowerCase()) || p.name?.toLowerCase().includes(q.toLowerCase()))
        : state.patients
      return delay(rows)
    },
    create: (body: { mrn: string; name?: string; sex?: 'M' | 'F'; birthYear?: number }) => {
      if (state.patients.some((p) => p.mrn.trim().toLowerCase() === body.mrn.trim().toLowerCase())) {
        throw new ApiError(409, `MRN ${body.mrn} is already in use`)
      }
      const patient: Patient = {
        id: `p-${state.patients.length + 1}`,
        mrn: body.mrn,
        name: body.name,
        sex: body.sex,
        birthYear: body.birthYear,
        createdAt: new Date().toISOString(),
        openDrafts: 0,
        completeness: 0,
      }
      state.patients.push(patient)
      state.encounters[patient.id] = []
      return delay(patient)
    },
    get: (id: string) => delay(state.patients.find((p) => p.id === id) ?? notFound('Patient')),
    update: (id: string, body: Partial<Patient>) => {
      const patient = state.patients.find((p) => p.id === id) ?? notFound('Patient')
      Object.assign(patient, body)
      return delay(patient)
    },
    encounters: (id: string) => delay(state.encounters[id] ?? notFound('Patient')),
    createEncounter: (id: string, body: { mode: 'clinical' | 'operative'; title?: string }) => {
      const list = state.encounters[id] ?? notFound('Patient')
      const encounter: Encounter = {
        id: `${id}-e${list.length + 1}`,
        patientId: id,
        mode: body.mode,
        title: body.title ?? (body.mode === 'operative' ? 'Operative note' : 'Clinical note'),
        text: '',
        sheet: {},
        openBundles: [],
        status: 'draft',
        bundlesVersion: MOCK_BUNDLES_PAYLOAD.version,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      list.push(encounter)
      return delay(encounter)
    },
  },

  encounters: {
    get: (id: string) => {
      for (const list of Object.values(state.encounters)) {
        const found = list.find((e) => e.id === id)
        if (found) return delay(found)
      }
      return notFound('Encounter')
    },
    save: (id: string, body: Pick<Encounter, 'text' | 'sheet'>) => {
      for (const list of Object.values(state.encounters)) {
        const found = list.find((e) => e.id === id)
        if (found) {
          if (found.status === 'final') throw new ApiError(409, 'A final encounter is immutable')
          Object.assign(found, body, { updatedAt: new Date().toISOString() })
          return delay(found)
        }
      }
      return notFound('Encounter')
    },
    finalize: (id: string) => {
      for (const list of Object.values(state.encounters)) {
        const found = list.find((e) => e.id === id)
        if (found) {
          found.status = 'final'
          found.finalizedAt = new Date().toISOString()
          return delay(found)
        }
      }
      return notFound('Encounter')
    },
  },

  bundles: () => delay(MOCK_BUNDLES_PAYLOAD),
  dashboardStats: () => delay(dashboardStats()),

  analyze: (body: AnalyzeRequest) => delay(mockAnalyze(body)),
  demoAnalyze: (body: AnalyzeRequest) => delay(mockAnalyze(body)),
}
