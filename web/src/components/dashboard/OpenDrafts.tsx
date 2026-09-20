import { DataTable, type Column } from '@/components/ui/DataTable'
import { Meter } from '@/components/ui/Meter'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { formatDate } from '@/components/charts/format'
import type { Encounter, Patient } from '@/lib/types'

export type DraftRow = { patient: Patient; encounter: Encounter; completeness: number }

function meterTone(v: number) {
  return v < 0.4 ? 'danger' : v < 0.7 ? 'warning' : 'success'
}

const COLUMNS: Column<DraftRow>[] = [
  {
    key: 'mrn',
    header: 'MRN',
    sortable: true,
    sortValue: (r) => r.patient.mrn,
    render: (r) => <span className="font-mono">{r.patient.mrn}</span>,
  },
  {
    key: 'name',
    header: 'Patient',
    sortable: true,
    sortValue: (r) => r.patient.name ?? '',
    render: (r) => r.patient.name ?? <span className="text-ink-3">—</span>,
  },
  {
    key: 'title',
    header: 'Note',
    render: (r) => (
      <span className="inline-flex items-center gap-2">
        <span className="truncate">{r.encounter.title}</span>
        <Badge tone={r.encounter.mode === 'operative' ? 'accent' : 'neutral'}>
          {r.encounter.mode === 'operative' ? 'Operative' : 'Clinical'}
        </Badge>
      </span>
    ),
  },
  {
    key: 'updated',
    header: 'Last edited',
    sortable: true,
    sortValue: (r) => r.encounter.updatedAt,
    render: (r) => formatDate(r.encounter.updatedAt),
  },
  {
    key: 'completeness',
    header: 'Completeness',
    align: 'end',
    sortable: true,
    sortValue: (r) => r.completeness,
    render: (r) => (
      <div className="flex items-center justify-end gap-2">
        <Meter value={Math.round(r.completeness * 100)} size="sm" tone={meterTone(r.completeness)} className="w-16" />
        <span className="tnum w-9 text-end">{Math.round(r.completeness * 100)}%</span>
      </div>
    ),
  },
  {
    key: 'resume',
    header: '',
    render: (r) => (
      <ButtonLink to={`/app/encounters/${r.encounter.id}`} size="sm" variant="tinted">
        Resume
      </ButtonLink>
    ),
  },
]

/** The dashboard's lead module: notes the doctor has not finalised, each resumable in one click. */
export function OpenDrafts({ rows }: { rows: DraftRow[] }) {
  return <DataTable columns={COLUMNS} rows={rows} rowKey={(r) => r.encounter.id} />
}
