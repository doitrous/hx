import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './api'
import { client, USING_MOCK } from './client'
import { track } from './analytics'
import type { AnalyzeResponse, Bundle, FieldKey, Sheet } from './types'

let firstTracked = false

export type AnalyzeStatus = 'idle' | 'pending' | 'error'

// Analyse on a finished clause, not on every pause: a doctor mid-sentence
// shouldn't cost a call every 700ms. A trailing `. , ; ? ! :` or newline
// (trailing spaces ignored) fires fast; anything else waits out a longer
// idle pause in case the clause never closes.
const CLAUSE_DEBOUNCE_MS = 400
const IDLE_DEBOUNCE_MS = 2500

function endsOnClause(text: string): boolean {
  const trimmed = text.replace(/[ \t]+$/, '')
  return /[.,;?!:\n]$/.test(trimmed)
}

export type UseAnalyzeOptions = {
  mode: 'clinical' | 'operative'
  /** The full bundle catalogue from client.bundles() — filtered here to this mode's kinds. */
  bundles: Bundle[]
  /** Use client.demoAnalyze (public, nothing stored) instead of client.analyze. */
  demo?: boolean
  patientId?: string
  initialText?: string
  initialSheet?: Sheet
  initialOpenBundles?: string[]
}

export type UseAnalyzeResult = {
  text: string
  setText: (text: string) => void
  sheet: Sheet
  /** Chronological — oldest-opened first, so "most recently opened" is the tail. */
  openBundleIds: string[]
  status: AnalyzeStatus
  errorMessage: string | null
  lastMs: number | null
  editField: (key: FieldKey, value: string) => void
  dismissField: (key: FieldKey) => void
  /** One level of undo for a dismissed (or edited) field — powers the dismiss toast's "Undo". */
  restoreField: (key: FieldKey) => void
  /** Landing-page example playback: merge a recorded response, and gate live analysis while it plays. */
  applyResponse: (res: Pick<AnalyzeResponse, 'bundles' | 'fields'>) => void
  setReplaying: (on: boolean) => void
}

function modeBundles(bundles: Bundle[], mode: 'clinical' | 'operative'): Bundle[] {
  return bundles.filter((b) => (mode === 'operative' ? b.kind.startsWith('op-') : b.kind === 'history' || b.kind === 'exam'))
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return err.message || 'Too many requests. The sheet will keep trying quietly.'
    if (err.status === 503) return err.message || 'The analysis service is briefly unavailable.'
    return err.message || 'The analysis service could not be reached.'
  }
  return 'The analysis service could not be reached.'
}

/**
 * Drives one note's analysis: debounces the text, calls analyze/demoAnalyze,
 * and merges the response into the sheet — never overwriting a field the
 * doctor edited or dismissed (CONTRACT.md's `source: "doctor"` rule).
 */
export function useAnalyze(opts: UseAnalyzeOptions): UseAnalyzeResult {
  // Open the server's connection to the engine before the first clause lands.
  useEffect(() => {
    if (!USING_MOCK) void fetch('/api/warm', { method: 'POST' }).catch(() => {})
  }, [])

  const { mode, demo, patientId } = opts
  const scoped = modeBundles(opts.bundles, mode)
  const alwaysOnIds = scoped.filter((b) => b.trigger === null).map((b) => b.id)
  const scopedIds = new Set(scoped.map((b) => b.id))

  const [text, setText] = useState(opts.initialText ?? '')
  const [sheet, setSheet] = useState<Sheet>(opts.initialSheet ?? {})
  const [openBundleIds, setOpenBundleIds] = useState<string[]>(() => {
    const seed = opts.initialOpenBundles?.length ? opts.initialOpenBundles : []
    return [...new Set([...alwaysOnIds, ...seed])]
  })
  const [status, setStatus] = useState<AnalyzeStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastMs, setLastMs] = useState<number | null>(null)

  const textRef = useRef(text)
  textRef.current = text
  const openRef = useRef(openBundleIds)
  openRef.current = openBundleIds
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  const alwaysOnRef = useRef(alwaysOnIds)
  alwaysOnRef.current = alwaysOnIds
  const scopedIdsRef = useRef(scopedIds)
  scopedIdsRef.current = scopedIds

  const inFlight = useRef(false)
  const dirty = useRef(false)
  const epoch = useRef(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const history = useRef<Record<FieldKey, Sheet[FieldKey] | undefined>>({})
  // The server's clause hash, echoed back as `prevHash` so it can skip
  // questions it already settled. Cleared on a blank note or a mode change;
  // a different encounter loading is expected to remount this hook entirely.
  const clauseHash = useRef<string | undefined>(undefined)
  const prevMode = useRef(mode)
  useEffect(() => {
    if (prevMode.current !== mode) {
      prevMode.current = mode
      clauseHash.current = undefined
    }
  }, [mode])

  // While the landing page replays a recorded example, typing must not reach the server at all.
  const replaying = useRef(false)
  const setReplaying = useCallback((on: boolean) => {
    replaying.current = on
  }, [])

  const applyResponse = useCallback((res: Pick<AnalyzeResponse, 'bundles' | 'fields'>) => {
    // A bundle catalogue can include both note types (op-core bundles are
    // always-on, for instance) — only ever surface the ones that belong to
    // this encounter's own mode, regardless of what the response sends.
    setSheet((prev) => {
      const next: Sheet = { ...prev }
      for (const [key, field] of Object.entries(res.fields)) {
        const bundleId = key.slice(0, key.lastIndexOf('.'))
        if (!scopedIdsRef.current.has(bundleId)) continue
        const existing = next[key]
        if (existing && (existing.source === 'doctor' || existing.state === 'dismissed')) continue
        next[key] = { value: field.value, unit: field.unit, state: field.state, source: 'jev', p: field.p, evidence: field.evidence }
      }
      return next
    })
    setOpenBundleIds((prev) => {
      const keep = new Set(prev)
      for (const id of alwaysOnRef.current) keep.add(id)
      for (const b of res.bundles) if (b.open && scopedIdsRef.current.has(b.id)) keep.add(b.id)
      const merged = prev.filter((id) => keep.has(id))
      for (const id of keep) if (!merged.includes(id)) merged.push(id)
      return merged
    })
  }, [])

  const runAnalyze = useCallback(async () => {
    if (inFlight.current) {
      dirty.current = true
      return
    }
    const snapshotText = textRef.current
    if (!snapshotText.trim()) return

    inFlight.current = true
    const myEpoch = epoch.current
    setStatus('pending')

    const known: Record<string, string> = {}
    for (const [key, entry] of Object.entries(sheetRef.current)) {
      if (entry.source === 'jev' && entry.evidence) known[key] = snapshotText.slice(entry.evidence.start, entry.evidence.end)
    }
    const locked = Object.entries(sheetRef.current)
      .filter(([, v]) => v.source === 'doctor' || v.state === 'dismissed')
      .map(([k]) => k)

    try {
      const fn = demo ? client.demoAnalyze : client.analyze
      const res: AnalyzeResponse = await fn({
        mode,
        text: snapshotText,
        open: openRef.current,
        locked,
        known,
        patientId,
        prevHash: clauseHash.current,
      })
      if (epoch.current !== myEpoch) return // superseded by a reset while this was in flight
      clauseHash.current = res.clausesHash

      applyResponse(res)
      setLastMs(res.ms)
      if (!firstTracked) {
        firstTracked = true
        track('first_analysis', { mode })
      }
      setStatus('idle')
      setErrorMessage(null)
    } catch (err) {
      if (epoch.current !== myEpoch) return
      setStatus('error')
      setErrorMessage(describeError(err))
    } finally {
      inFlight.current = false
      if (dirty.current) {
        dirty.current = false
        runAnalyze()
      }
    }
  }, [mode, demo, patientId, applyResponse])

  // Fire on a finished clause (fast), fall back to an idle pause otherwise.
  // A paste or a loaded example almost always ends on punctuation already,
  // so it analyses at the fast interval too — never waits for the full idle
  // fallback. Empty text resets to always-on bundles and issues no request.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (!text.trim()) {
      epoch.current += 1
      history.current = {}
      clauseHash.current = undefined
      setSheet({})
      setOpenBundleIds([...alwaysOnRef.current])
      setStatus('idle')
      setErrorMessage(null)
      return
    }
    if (replaying.current) return
    if (inFlight.current) {
      dirty.current = true
      return
    }
    debounceTimer.current = setTimeout(runAnalyze, endsOnClause(text) ? CLAUSE_DEBOUNCE_MS : IDLE_DEBOUNCE_MS)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
    // alwaysOnIds is derived from opts.bundles/mode each render; comparing the
    // joined ids (rather than the array identity) keeps this from re-firing
    // on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, runAnalyze, alwaysOnIds.join(',')])

  const editField = useCallback((key: FieldKey, value: string) => {
    setSheet((prev) => ({
      ...prev,
      [key]: { value, unit: prev[key]?.unit, state: 'filled', source: 'doctor', p: prev[key]?.p, evidence: null },
    }))
  }, [])

  const dismissField = useCallback((key: FieldKey) => {
    setSheet((prev) => {
      history.current[key] = prev[key]
      return {
        ...prev,
        [key]: {
          value: prev[key]?.value ?? null,
          unit: prev[key]?.unit,
          state: 'dismissed',
          source: prev[key]?.source ?? 'jev',
          p: prev[key]?.p,
          evidence: prev[key]?.evidence ?? null,
        },
      }
    })
  }, [])

  const restoreField = useCallback((key: FieldKey) => {
    setSheet((prev) => {
      const next = { ...prev }
      const previous = history.current[key]
      if (previous) next[key] = previous
      else delete next[key]
      delete history.current[key]
      return next
    })
  }, [])

  return { text, setText, sheet, openBundleIds, status, errorMessage, lastMs, editField, dismissField, restoreField, applyResponse, setReplaying }
}
