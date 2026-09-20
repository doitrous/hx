import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Search, UserPlus, Users as UsersIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Meter } from '@/components/ui/Meter'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { NewPatientDialog } from '@/components/patients/NewPatientDialog'
import { formatDate } from '@/components/charts/format'
import { client } from '@/lib/client'
import type { Patient } from '@/lib/types'

function age(birthYear?: number) {
  return birthYear ? new Date().getFullYear() - birthYear : undefined
}

function meterTone(v: number): 'danger' | 'warning' | 'success' {
  return v < 0.4 ? 'danger' : v < 0.7 ? 'warning' : 'success'
}

export function Patients() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [input, setInput] = useState(q)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [rows, setRows] = useState<Patient[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    setStatus('loading')
    client
      .patients.list(q || undefined)
      .then((r) => {
        if (alive) {
          setRows(r)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (input) next.set('q', input)
      else next.delete('q')
      setParams(next, { replace: true })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  const columns: Column<Patient>[] = useMemo(
    () => [
      { key: 'mrn', header: 'MRN', sortable: true, sortValue: (p) => p.mrn, render: (p) => <span className="font-mono">{p.mrn}</span> },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        sortValue: (p) => p.name ?? '',
        render: (p) => p.name ?? <span className="text-ink-3">Not stored</span>,
      },
      {
        key: 'age',
        header: 'Age / sex',
        render: (p) => {
          const a = age(p.birthYear)
          if (a == null && !p.sex) return <span className="text-ink-3">—</span>
          return (
            <span className="tnum">
              {a != null ? `${a}y` : '—'}
              {a != null && p.sex ? ' · ' : ''}
              {p.sex ?? ''}
            </span>
          )
        },
      },
      {
        key: 'last',
        header: 'Last encounter',
        sortable: true,
        sortValue: (p) => p.lastEncounterAt ?? '',
        render: (p) => (p.lastEncounterAt ? formatDate(p.lastEncounterAt) : <span className="text-ink-3">—</span>),
      },
      {
        key: 'drafts',
        header: 'Open drafts',
        align: 'end',
        sortable: true,
        sortValue: (p) => p.openDrafts,
        render: (p) => (p.openDrafts > 0 ? <Badge tone="warning" dot>{p.openDrafts}</Badge> : <span className="tnum text-ink-3">0</span>),
      },
      {
        key: 'completeness',
        header: 'Completeness',
        align: 'end',
        sortable: true,
        sortValue: (p) => p.completeness ?? 0,
        render: (p) =>
          p.completeness != null ? (
            <div className="flex items-center justify-end gap-2">
              <Meter value={Math.round(p.completeness * 100)} size="sm" tone={meterTone(p.completeness)} className="w-14" />
              <span className="tnum w-9 text-end">{Math.round(p.completeness * 100)}%</span>
            </div>
          ) : (
            <span className="text-ink-3">—</span>
          ),
      },
    ],
    [],
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 pb-16 sm:p-8">
      <PageHeader
        title="Patients"
        description="Every patient in your panel, by MRN."
        action={
          <Button variant="primary" iconLeft={UserPlus} onClick={() => setDialogOpen(true)}>
            New patient
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Icon icon={Search} size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by MRN or name"
          className="ps-9"
          aria-label="Search patients"
        />
      </div>

      <Panel>
        {status === 'loading' ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : status === 'error' ? (
          <EmptyState icon={AlertTriangle} title="Could not load patients" description="Something went wrong reaching the server." />
        ) : rows.length === 0 ? (
          q ? (
            <EmptyState icon={Search} title="No matches" description={`No patient matches "${q}".`} />
          ) : (
            <EmptyState
              icon={UsersIcon}
              title="No patients yet"
              description="Add your first patient to get started."
              action={
                <Button variant="primary" onClick={() => setDialogOpen(true)}>
                  New patient
                </Button>
              }
            />
          )
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} onRowClick={(p) => navigate(`/app/patients/${p.id}`)} />
        )}
      </Panel>

      {dialogOpen && (
        <NewPatientDialog
          onClose={() => setDialogOpen(false)}
          onCreated={(patient) => {
            setDialogOpen(false)
            navigate(`/app/patients/${patient.id}`)
          }}
        />
      )}
    </div>
  )
}
