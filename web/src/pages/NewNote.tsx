import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Scissors, Search, UserPlus, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Kbd } from '@/components/ui/Kbd'
import { NewPatientDialog } from '@/components/patients/NewPatientDialog'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { Patient } from '@/lib/types'

/** Fast two-step flow: find or create the patient, choose the note type, go. Done many times a day, so it's keyboard-first. */
export function NewNote() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [highlight, setHighlight] = useState(0)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [mode, setMode] = useState<'clinical' | 'operative' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (patient) return
    const t = setTimeout(() => {
      client.patients.list(query || undefined).then((r) => {
        setResults(r.slice(0, 8))
        setHighlight(0)
      })
    }, 150)
    return () => clearTimeout(t)
  }, [query, patient])

  function onKeyDown(e: KeyboardEvent) {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const p = results[highlight]
      if (p) setPatient(p)
    }
  }

  async function start() {
    if (!patient || !mode) return
    setStarting(true)
    setError(null)
    try {
      const encounter = await client.patients.createEncounter(patient.id, { mode })
      navigate(`/app/encounters/${encounter.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-16 sm:p-8">
      <PageHeader title="New note" description="Find the patient, pick the note type, and go." />

      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Step 1 · Patient</span>
          {!patient ? (
            <>
              <div className="relative">
                <Icon icon={Search} size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search by MRN or name…"
                  className="ps-9"
                  aria-label="Search for a patient"
                  role="combobox"
                  aria-expanded={results.length > 0}
                  autoFocus
                />
              </div>
              {results.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-lg border border-line" role="listbox">
                  {results.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === highlight}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => setPatient(p)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-[13px] transition-colors',
                          i === highlight ? 'bg-primary-tint text-primary-strong' : 'bg-surface text-ink hover:bg-inset/70',
                        )}
                      >
                        <span className="font-mono">{p.mrn}</span>
                        <span className="min-w-0 flex-1 truncate text-end text-ink-2">{p.name ?? 'Not stored'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[12px] text-ink-3">
                  <Kbd>&uarr;</Kbd> <Kbd>&darr;</Kbd> to browse, <Kbd>&crarr;</Kbd> to choose
                </p>
                <Button variant="ghost" size="sm" iconLeft={UserPlus} onClick={() => setDialogOpen(true)}>
                  New patient
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-line-2 bg-surface-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="font-mono text-[13px] text-ink">{patient.mrn}</span>
                <span className="truncate text-[13px] text-ink-2">{patient.name ?? 'Not stored'}</span>
              </div>
              <IconButton
                icon={X}
                label="Change patient"
                size="sm"
                onClick={() => {
                  setPatient(null)
                  setMode(null)
                }}
              />
            </div>
          )}
        </div>
      </Panel>

      <Panel className={cn('p-5 sm:p-6', !patient && 'opacity-50')}>
        <div className="flex flex-col gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Step 2 · Note type</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!patient}
              onClick={() => setMode('clinical')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-start transition-colors disabled:cursor-not-allowed',
                mode === 'clinical' ? 'border-primary-line bg-primary-tint' : 'border-line bg-surface hover:border-line-2',
              )}
            >
              <Icon icon={FileText} size={20} className={mode === 'clinical' ? 'text-primary-strong' : 'text-ink-3'} />
              <div className="text-[13.5px] font-semibold text-ink">Clinical note</div>
              <div className="text-[12px] text-ink-2">History and examination</div>
            </button>
            <button
              type="button"
              disabled={!patient}
              onClick={() => setMode('operative')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-start transition-colors disabled:cursor-not-allowed',
                mode === 'operative' ? 'border-primary-line bg-primary-tint' : 'border-line bg-surface hover:border-line-2',
              )}
            >
              <Icon icon={Scissors} size={20} className={mode === 'operative' ? 'text-primary-strong' : 'text-ink-3'} />
              <div className="text-[13.5px] font-semibold text-ink">Operative note</div>
              <div className="text-[12px] text-ink-2">Procedure and events</div>
            </button>
          </div>
        </div>
      </Panel>

      {error && (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <Button variant="primary" size="lg" disabled={!patient || !mode} loading={starting} onClick={start}>
        Start note
      </Button>

      {dialogOpen && (
        <NewPatientDialog
          onClose={() => setDialogOpen(false)}
          onCreated={(p) => {
            setDialogOpen(false)
            setPatient(p)
          }}
        />
      )}
    </div>
  )
}
