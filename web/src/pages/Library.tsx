import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Chip, SystemChip } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { BundleGraph } from '@/components/library/BundleGraph'
import { client } from '@/lib/client'
import { cn } from '@/lib/cn'
import type { Bundle } from '@/lib/types'

const KINDS: { value: Bundle['kind'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All kinds' },
  { value: 'history', label: 'History' },
  { value: 'exam', label: 'Examination' },
  { value: 'op-core', label: 'Op · core' },
  { value: 'op-event', label: 'Op · event' },
  { value: 'op-procedure', label: 'Op · procedure' },
]

/** Read-only browser over client.bundles(). ~160 bundles / ~1300 fields total, so only the selected bundle's fields ever render. */
export function Library() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Bundle['kind'] | 'all'>('all')

  useEffect(() => {
    client
      .bundles()
      .then((b) => {
        setBundles(b.bundles)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bundles.filter((b) => {
      if (kind !== 'all' && b.kind !== kind) return false
      if (!q) return true
      if (b.title.toLowerCase().includes(q)) return true
      return b.items.some((i) => i.label.toLowerCase().includes(q))
    })
  }, [bundles, query, kind])

  const selectedId = params.get('bundle')
  const selected = bundles.find((b) => b.id === selectedId) ?? null

  function select(id: string | null) {
    const next = new URLSearchParams(params)
    if (id) next.set('bundle', id)
    else next.delete('bundle')
    setParams(next, { replace: true })
  }

  const openedBy = useMemo(() => {
    if (!selected) return []
    const rows: { bundle: Bundle; reason?: string }[] = []
    for (const b of bundles) {
      for (const item of b.items) {
        if (item.link === selected.id) rows.push({ bundle: b, reason: item.reason })
      }
    }
    return rows
  }, [bundles, selected])

  const opens = useMemo(() => {
    if (!selected) return []
    const rows: { bundle: Bundle; reason?: string; via: string }[] = []
    for (const item of selected.items) {
      if (!item.link) continue
      const bundle = bundles.find((b) => b.id === item.link)
      if (bundle) rows.push({ bundle, reason: item.reason, via: item.label })
    }
    return rows
  }, [selected, bundles])

  if (status === 'loading') {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <Panel>
          <EmptyState icon={AlertTriangle} title="Could not load the library" description="Something went wrong reaching the server." />
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 pb-16 sm:p-8">
      <PageHeader title="Library" description="Every history, examination and operative bundle the note engine knows — read-only." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Icon icon={Search} size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and fields"
            className="ps-9"
            aria-label="Search the library"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
              {k.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
        <Panel>
          <PanelHeader title="Bundles" hint={`${filtered.length} of ${bundles.length}`} />
          <div className="max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <EmptyState title="No matches" description="Try a different search or filter." />
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => select(b.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-2.5 text-start transition-colors',
                        selected?.id === b.id ? 'bg-primary-tint' : 'hover:bg-inset/70',
                      )}
                    >
                      <span className={cn('truncate text-[13px] font-medium', selected?.id === b.id ? 'text-primary-strong' : 'text-ink')}>
                        {b.title}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <SystemChip system={b.system} />
                        <Badge tone={b.status === 'reviewed' ? 'success' : b.status === 'checked' ? 'accent' : 'warning'}>{b.status === 'reviewed' ? 'Reviewed' : b.status === 'checked' ? 'Checked' : 'Draft'}</Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          {!selected ? (
            <Panel>
              <EmptyState title="Select a bundle" description="Choose one from the list to see its trigger, fields and connections." />
            </Panel>
          ) : (
            <>
              <Panel className="p-5">
                <div className="flex items-center gap-2">
                  <SystemChip system={selected.system} />
                  <Badge tone={selected.status === 'reviewed' ? 'success' : selected.status === 'checked' ? 'accent' : 'warning'}>
                    {selected.status === 'reviewed' ? 'Reviewed' : selected.status === 'checked' ? 'Checked' : 'Draft'}
                  </Badge>
                </div>
                <h2 className="mt-2 font-serif text-[20px] font-semibold text-ink">{selected.title}</h2>
                <p className="mt-1 max-w-xl text-[13px] text-ink-2">{selected.about}</p>
                <div className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink-2">
                  <span className="font-semibold text-ink-3">Trigger — </span>
                  {selected.trigger ?? <span className="italic">Always open</span>}
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Fields" hint={`${selected.items.length}`} />
                <ul className="divide-y divide-line">
                  {selected.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-[13px] font-medium text-ink">{item.label}</span>
                      <span className="flex items-center gap-2">
                        <Badge tone="neutral">{item.type}</Badge>
                        {item.link && (
                          <Badge tone="accent">opens {bundles.find((b) => b.id === item.link)?.title ?? item.link}</Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <div className="grid gap-5 md:grid-cols-2">
                <Panel>
                  <PanelHeader title="Opens" hint={String(opens.length)} />
                  {opens.length === 0 ? (
                    <EmptyState title="Opens nothing" description="No field in this bundle links onward." />
                  ) : (
                    <ul className="divide-y divide-line">
                      {opens.map((o) => (
                        <li key={o.bundle.id} className="px-4 py-2.5">
                          <button onClick={() => select(o.bundle.id)} className="text-[13px] font-medium text-accent hover:underline">
                            {o.bundle.title}
                          </button>
                          <p className="mt-0.5 text-[12px] text-ink-2">
                            via "{o.via}"{o.reason ? ` — ${o.reason}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel>
                  <PanelHeader title="Opened by" hint={String(openedBy.length)} />
                  {openedBy.length === 0 ? (
                    <EmptyState title="Not opened by anything" description="No other bundle links here." />
                  ) : (
                    <ul className="divide-y divide-line">
                      {openedBy.map((o) => (
                        <li key={o.bundle.id} className="px-4 py-2.5">
                          <button onClick={() => select(o.bundle.id)} className="text-[13px] font-medium text-accent hover:underline">
                            {o.bundle.title}
                          </button>
                          {o.reason && <p className="mt-0.5 text-[12px] text-ink-2">{o.reason}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <Panel>
                <PanelHeader title="Connections" hint="One hop from this bundle" />
                <div className="p-4">
                  <BundleGraph center={selected} opens={opens} openedBy={openedBy} onSelect={select} />
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
