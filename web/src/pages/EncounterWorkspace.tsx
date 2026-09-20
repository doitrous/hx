import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Lock } from 'lucide-react'
import { PatientBanner } from '@/components/shell/PatientBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/ui/Icon'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { Workspace } from '@/components/workspace/Workspace'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import type { Bundles, Encounter, Patient, Sheet } from '@/lib/types'

const AUTOSAVE_MS = 2000

function formatClock(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * The product screen: one encounter's note and record sheet, autosaved and
 * finalizable. The workspace itself (note pane + sheet + connections) is
 * shared with the public demo via `Workspace` — this page adds the identity
 * banner, load/save plumbing and the Finalize flow the demo doesn't have.
 */
export function EncounterWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [bundles, setBundles] = useState<Bundles | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([client.encounters.get(id), client.bundles()])
      .then(([enc, b]) => {
        if (cancelled) return
        setEncounter(enc)
        setBundles(b)
        setSavedAt(enc.updatedAt)
        return client.patients.get(enc.patientId)
      })
      .then((p) => {
        if (!cancelled && p) setPatient(p)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this encounter.')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    ({ text, sheet }: { text: string; sheet: Sheet }) => {
      if (!id || !encounter || encounter.status === 'final') return
      setSaveState('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          const saved = await client.encounters.save(id, { text, sheet })
          setSavedAt(saved.updatedAt)
          setSaveState('saved')
        } catch {
          setSaveState('error')
        }
      }, AUTOSAVE_MS)
    },
    [id, encounter],
  )

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  async function finalize() {
    if (!id) return
    setFinalizing(true)
    try {
      const final = await client.encounters.finalize(id)
      setEncounter(final)
      setFinalizeOpen(false)
      toast('Encounter finalized', 'success')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not finalize this encounter', 'danger')
    } finally {
      setFinalizing(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-[14px] text-ink-2">{loadError}</p>
        <Button variant="tinted" onClick={() => navigate('/app')}>Back to dashboard</Button>
      </div>
    )
  }

  if (!encounter || !patient || !bundles) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-7 w-64" />
        <SkeletonText lines={3} />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const isFinal = encounter.status === 'final'
  const age = patient.birthYear ? new Date().getFullYear() - patient.birthYear : undefined

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Could not save' : savedAt ? `Saved ${formatClock(savedAt)}` : ''

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <PatientBanner mrn={patient.mrn} age={age} sex={patient.sex} />
      <Workspace
        key={encounter.id}
        className="min-h-0 flex-1"
        mode={encounter.mode}
        bundles={bundles.bundles}
        patientId={patient.id}
        initialText={encounter.text}
        initialSheet={encounter.sheet}
        initialOpenBundles={encounter.openBundles}
        readOnly={isFinal}
        onChange={handleChange}
        headerExtra={
          <div className="flex shrink-0 items-center gap-2.5">
            {isFinal ? (
              <Badge tone="success" dot>Final</Badge>
            ) : (
              <span className={`text-[12px] tnum ${saveState === 'error' ? 'text-danger' : 'text-ink-3'}`}>{saveLabel}</span>
            )}
            {!isFinal && (
              <Button size="sm" variant="tinted" iconLeft={Lock} onClick={() => setFinalizeOpen(true)}>
                Finalize
              </Button>
            )}
          </div>
        }
      />

      {finalizeOpen && (
        <Dialog onClose={() => setFinalizeOpen(false)} label="Finalize encounter">
          <div className="p-5">
            <div className="mb-3 grid size-10 place-items-center rounded-xl border border-line bg-surface-2 text-primary">
              <Icon icon={CheckCircle2} size={19} />
            </div>
            <h3 className="font-serif text-[18px] font-semibold text-ink">Finalize this encounter?</h3>
            <p className="mt-2 text-[13.5px] text-ink-2">
              A final encounter is read-only — the note and every field on the sheet become locked. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFinalizeOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={finalize} loading={finalizing}>Finalize</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
