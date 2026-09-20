import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileText, Inbox, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SystemChip } from '@/components/ui/Chip'
import { StatRow } from '@/components/dashboard/StatRow'
import { OpenDrafts, type DraftRow } from '@/components/dashboard/OpenDrafts'
import { encounterCompleteness } from '@/components/dashboard/completeness'
import { HorizontalBars, type BarRow } from '@/components/charts/HorizontalBars'
import { WeekColumns } from '@/components/charts/WeekColumns'
import { formatDate } from '@/components/charts/format'
import { client } from '@/lib/client'
import type { Bundle, DashboardStats, Patient } from '@/lib/types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; stats: DashboardStats; patients: Patient[]; bundles: Bundle[]; drafts: DraftRow[] }

const RECENT_COLUMNS: Column<Patient>[] = [
  { key: 'mrn', header: 'MRN', render: (p) => <span className="font-mono">{p.mrn}</span> },
  { key: 'name', header: 'Name', render: (p) => p.name ?? <span className="text-ink-3">—</span> },
  {
    key: 'last',
    header: 'Last encounter',
    align: 'end',
    render: (p) => (p.lastEncounterAt ? formatDate(p.lastEncounterAt) : <span className="text-ink-3">—</span>),
  },
]

export function Dashboard() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [stats, patients, { bundles }] = await Promise.all([
          client.dashboardStats(),
          client.patients.list(),
          client.bundles(),
        ])
        // DashboardStats only carries an aggregate openDrafts count, not the
        // encounters themselves — fan out per patient to find them. Fine at a
        // solo doctor's patient-list scale; a dedicated endpoint would scale better.
        const candidates = patients.filter((p) => p.openDrafts > 0)
        const encounterLists = await Promise.all(candidates.map((p) => client.patients.encounters(p.id)))
        if (!alive) return
        const drafts: DraftRow[] = []
        candidates.forEach((patient, i) => {
          for (const encounter of encounterLists[i]) {
            if (encounter.status === 'draft') {
              drafts.push({ patient, encounter, completeness: encounterCompleteness(encounter.sheet, encounter.openBundles, bundles) })
            }
          }
        })
        drafts.sort((a, b) => new Date(b.encounter.updatedAt).getTime() - new Date(a.encounter.updatedAt).getTime())
        setState({ status: 'ready', stats, patients, bundles, drafts })
      } catch {
        if (alive) setState({ status: 'error' })
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="p-4">
            <SkeletonText lines={4} />
          </Panel>
          <Panel className="p-4">
            <SkeletonText lines={4} />
          </Panel>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Could not load the dashboard"
            description="Something went wrong reaching the server. Try refreshing the page."
          />
        </Panel>
      </div>
    )
  }

  const { stats, patients, drafts } = state
  const isNewDoctor = patients.length === 0

  const mostMissedRows: BarRow[] = stats.mostMissed.map((m) => ({
    key: m.fieldKey,
    label: m.label,
    sublabel: `${m.bundleTitle} · n=${m.n}`,
    text: `${m.label} (${m.bundleTitle})`,
    value: m.missedRate,
    displayValue: `${Math.round(m.missedRate * 100)}%`,
    onClick: () => navigate(`/app/library?bundle=${encodeURIComponent(m.fieldKey.split('.')[0])}`),
  }))

  const bySystemRows: BarRow[] = [...stats.bySystem]
    .sort((a, b) => b.encounters - a.encounters)
    .map((s) => ({
      key: s.system,
      label: <SystemChip system={s.system} />,
      text: s.system,
      value: s.encounters,
      displayValue: String(s.encounters),
      color: 'var(--color-ink-3)', // the system chip carries the colour; crimson is reserved for what needs attention
    }))

  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.lastEncounterAt ?? b.createdAt).getTime() - new Date(a.lastEncounterAt ?? a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 pb-16 sm:p-8">
      <PageHeader
        title="Dashboard"
        description="Your patients, what's still open, and what you most often leave undocumented."
        action={
          <ButtonLink to="/app/new" variant="primary" iconLeft={FileText}>
            New note
          </ButtonLink>
        }
      />

      <StatRow
        stats={[
          { label: 'Patients', value: String(stats.patients) },
          { label: 'Encounters this week', value: String(stats.encountersThisWeek) },
          { label: 'Open drafts', value: String(stats.openDrafts) },
          { label: 'Average completeness', value: `${Math.round(stats.avgCompleteness * 100)}%` },
        ]}
      />

      {isNewDoctor ? (
        <Panel>
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Add your first patient and start a note — this dashboard fills in as you document."
            action={
              <ButtonLink to="/app/new" variant="primary">
                Start a note
              </ButtonLink>
            }
          />
        </Panel>
      ) : (
        <>
          <Panel>
            <PanelHeader title="Open drafts" hint={`${drafts.length} unfinished`} />
            {drafts.length === 0 ? (
              <EmptyState icon={Inbox} title="No open drafts" description="Every note is finalised. Nice work." />
            ) : (
              <OpenDrafts rows={drafts} />
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="What you most often leave undocumented" hint="Missed rate by field" />
              <HorizontalBars rows={mostMissedRows} name="Most-missed fields" labelWidth="w-44" />
            </Panel>

            <Panel>
              <PanelHeader title="Completeness over time" hint="Weekly average, this quarter" />
              <div className="p-4">
                <WeekColumns data={stats.completenessByWeek} name="Completeness by week" />
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Patients" hint="Most recently seen" action={<ButtonLink to="/app/patients" variant="ghost" size="sm">View all</ButtonLink>} />
              <DataTable columns={RECENT_COLUMNS} rows={recentPatients} rowKey={(p) => p.id} />
            </Panel>

            <Panel>
              <PanelHeader title="Case mix" hint="Encounters by system" />
              <HorizontalBars rows={bySystemRows} name="Encounters by system" labelWidth="w-36" />
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
