import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, FileText, Scissors, SquarePen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SystemChip } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { Meter } from '@/components/ui/Meter'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { PatientBanner } from '@/components/shell/PatientBanner'
import { EditPatientDialog } from '@/components/patients/EditPatientDialog'
import { deriveProblems, deriveTrends } from '@/components/patients/derive'
import { encounterCompleteness } from '@/components/dashboard/completeness'
import { Timeline } from '@/components/charts/Timeline'
import { TrendStrip } from '@/components/charts/TrendStrip'
import { formatDate } from '@/components/charts/format'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import type { Bundle, Encounter, Patient } from '@/lib/types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; patient: Patient; encounters: Encounter[]; bundles: Bundle[] }

function age(birthYear?: number) {
  return birthYear ? new Date().getFullYear() - birthYear : undefined
}

export function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [editOpen, setEditOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!id) return
    let alive = true
    setState({ status: 'loading' })
    Promise.all([client.patients.get(id), client.patients.encounters(id), client.bundles()])
      .then(([patient, encounters, { bundles }]) => {
        if (alive) setState({ status: 'ready', patient, encounters, bundles })
      })
      .catch(() => {
        if (alive) setState({ status: 'error' })
      })
    return () => {
      alive = false
    }
  }, [id])

  async function startEncounter(mode: 'clinical' | 'operative') {
    if (!id) return
    setCreating(true)
    try {
      const encounter = await client.patients.createEncounter(id, { mode })
      navigate(`/app/encounters/${encounter.id}`)
    } catch (err) {
      setCreating(false)
      toast(err instanceof ApiError ? err.message : 'Could not start the note. Try again.', 'danger')
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
        <PatientBanner mrn={id ?? '—'} />
        <Skeleton className="h-8 w-64" />
        <Panel className="p-4">
          <SkeletonText lines={4} />
        </Panel>
        <Panel className="p-4">
          <SkeletonText lines={4} />
        </Panel>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <PatientBanner mrn={id ?? '—'} />
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Could not load this patient"
            description="Check the link, or go back to the patient list."
          />
        </Panel>
      </div>
    )
  }

  const { patient, encounters, bundles } = state
  const problems = deriveProblems(encounters, bundles)
  const trends = deriveTrends(encounters, bundles)
  const sortedEncounters = [...encounters].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-16 sm:p-8">
      <PatientBanner mrn={patient.mrn} age={age(patient.birthYear)} sex={patient.sex} />

      <PageHeader
        title={patient.name ?? `Patient ${patient.mrn}`}
        description={`MRN ${patient.mrn}${patient.sex ? ` · ${patient.sex}` : ''}${patient.birthYear ? ` · born ${patient.birthYear}` : ''}`}
        action={
          // A grid, not a flex row: a nested flex-wrap row has no definite width of its
          // own to wrap against (its shrink-0 parent sizes it by unwrapped max-content),
          // so it silently overflows on narrow screens instead of stacking. A single-
          // column grid's intrinsic width is just its widest child, which fixes that.
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:flex-wrap">
            <Button variant="tinted" iconLeft={SquarePen} onClick={() => setEditOpen(true)}>
              Edit details
            </Button>
            <Button variant="tinted" iconLeft={Scissors} loading={creating} onClick={() => startEncounter('operative')}>
              New operative note
            </Button>
            <Button variant="primary" iconLeft={FileText} loading={creating} onClick={() => startEncounter('clinical')}>
              New clinical note
            </Button>
          </div>
        }
      />

      <Panel>
        <PanelHeader
          title="Problem list"
          hint={`${problems.length} opened across ${encounters.length} encounter${encounters.length === 1 ? '' : 's'}`}
        />
        {problems.length === 0 ? (
          <EmptyState
            title="No problems flagged yet"
            description="Bundles a note triggers will show up here, with when they were first and last seen."
          />
        ) : (
          <ul className="divide-y divide-line">
            {problems.map(({ bundle, firstSeen, lastSeen }) => (
              <li key={bundle.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <SystemChip system={bundle.system} />
                  <span className="truncate text-[13.5px] font-medium text-ink">{bundle.title}</span>
                </div>
                <div className="tnum shrink-0 text-[12px] text-ink-2">
                  First seen {formatDate(firstSeen)}
                  {lastSeen !== firstSeen ? ` · last seen ${formatDate(lastSeen)}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Trends" hint="Recurring measurements across encounters" />
        {trends.length === 0 ? (
          <EmptyState title="No recurring measurements yet" description="A field tracked in two or more encounters will trend here." />
        ) : (
          <div>
            {trends.map((t) => (
              <TrendStrip key={t.fieldKey} label={t.label} unit={t.unit} points={t.points} n={t.points.length} />
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Encounter timeline" hint={`${encounters.length} total`} />
        {encounters.length === 0 ? (
          <EmptyState
            title="No encounters yet"
            description="Start the patient's first note."
            action={
              <Button variant="primary" onClick={() => startEncounter('clinical')}>
                New clinical note
              </Button>
            }
          />
        ) : (
          <>
            <div className="border-b border-line px-4 py-4">
              <Timeline
                name="Encounter timeline"
                points={encounters.map((e) => ({
                  id: e.id,
                  date: e.createdAt,
                  label: e.title,
                  status: e.status,
                  onSelect: () => navigate(`/app/encounters/${e.id}`),
                }))}
              />
            </div>
            <ul className="divide-y divide-line">
              {sortedEncounters.map((e) => {
                const completeness = encounterCompleteness(e.sheet, e.openBundles, bundles)
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => navigate(`/app/encounters/${e.id}`)}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-inset/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                    >
                      <span className="tnum w-24 shrink-0 text-[12.5px] text-ink-2">{formatDate(e.createdAt)}</span>
                      <Badge tone={e.mode === 'operative' ? 'accent' : 'neutral'}>{e.mode === 'operative' ? 'Operative' : 'Clinical'}</Badge>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{e.title}</span>
                      <Badge tone={e.status === 'final' ? 'success' : 'warning'} dot>
                        {e.status === 'final' ? 'Final' : 'Draft'}
                      </Badge>
                      <div className="flex shrink-0 items-center gap-2">
                        <Meter value={Math.round(completeness * 100)} size="sm" className="w-14" />
                        <span className="tnum w-9 text-end text-[12px] text-ink-2">{Math.round(completeness * 100)}%</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Panel>

      {editOpen && (
        <EditPatientDialog
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSaved={(p) => {
            setState({ status: 'ready', patient: p, encounters, bundles })
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
