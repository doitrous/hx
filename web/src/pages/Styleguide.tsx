import { useState } from 'react'
import { AlertTriangle, Calendar, ChevronRight, Inbox, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button, ButtonLink } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Chip, SystemChip } from '@/components/ui/Chip'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { Meter, RangeScale } from '@/components/ui/Meter'
import { Tabs } from '@/components/ui/Tabs'
import { Collapse } from '@/components/ui/Collapse'
import { Dialog } from '@/components/ui/Dialog'
import { Popover, Tooltip } from '@/components/ui/Popover'
import { useToast } from '@/components/ui/Toast'
import { Skeleton, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Kbd } from '@/components/ui/Kbd'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useThemeOverride } from '@/lib/theme'
import { SYSTEM_NAMES } from '@/lib/systems'
import { cn } from '@/lib/cn'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-[19px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Swatch({ name, varName, value, note }: { name: string; varName: string; value: string; note?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
      <div className="size-10 shrink-0 rounded-md border border-line" style={{ background: `var(${varName})` }} />
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-semibold text-ink">{name}</div>
        <div className="truncate font-mono text-[11px] text-ink-3">{varName}</div>
        {note && <div className="truncate text-[11px] text-ink-2">{note}</div>}
      </div>
      <div className="ms-auto font-mono text-[11px] tnum text-ink-3">{value}</div>
    </div>
  )
}

const DEMO_ROWS = [
  { id: 1, mrn: 'DEMO-0001', name: 'Alia Patient', system: 'Abdominal', completeness: 0.82 },
  { id: 2, mrn: 'DEMO-0002', name: 'Marcus Patient', system: 'Cardiac', completeness: 0.41 },
  { id: 3, mrn: 'DEMO-0003', name: 'Youssef Patient', system: 'Chest', completeness: 0.67 },
]

const DEMO_COLUMNS: Column<(typeof DEMO_ROWS)[number]>[] = [
  { key: 'mrn', header: 'MRN', sortable: true, sortValue: (r) => r.mrn, render: (r) => <span className="font-mono">{r.mrn}</span> },
  { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, render: (r) => r.name },
  { key: 'system', header: 'System', render: (r) => <SystemChip system={r.system} /> },
  {
    key: 'completeness',
    header: 'Completeness',
    align: 'end',
    sortable: true,
    sortValue: (r) => r.completeness,
    render: (r) => <span className="tnum">{Math.round(r.completeness * 100)}%</span>,
  },
]

export function Styleguide() {
  const [theme, setTheme] = useThemeOverride()
  const [tab, setTab] = useState('one')
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const toast = useToast()

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 p-4 pb-24 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Styleguide"
          description="Every token and primitive in the Hx design system, for review. Not part of the product."
        />
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-1">
          {(['light', 'dark', null] as const).map((t) => (
            <button
              key={String(t)}
              onClick={() => setTheme(t)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[12.5px] font-medium',
                theme === t ? 'bg-inset text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              {t ?? 'system'}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Color ------------------------------------------------------ */}
      <Section title="Color" description="70% neutral / 25% crimson / 5% blue per screen. Values shown are the active theme's — toggle above.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Swatch name="Paper (ground)" varName="--color-paper" value="#f5f7fb" />
          <Swatch name="Surface" varName="--color-surface" value="#ffffff" />
          <Swatch name="Surface 2" varName="--color-surface-2" value="#eef1f7" />
          <Swatch name="Ink" varName="--color-ink" value="#161920" note="Body text, ~15:1 on paper" />
          <Swatch name="Ink 2" varName="--color-ink-2" value="#5d636f" note=">=4.5:1 on paper (AA)" />
          <Swatch name="Ink 3" varName="--color-ink-3" value="#5f6778" note="Decorative only" />
          <Swatch name="Line" varName="--color-line" value="#e3e7ef" note="Hairline" />
          <Swatch name="Line 2" varName="--color-line-2" value="#ccd3e0" note="Control border" />
          <Swatch name="Primary (crimson)" varName="--color-primary" value="#d13a63" note="4.67:1 with white label" />
          <Swatch name="Primary hover" varName="--color-primary-hover" value="#b62d55" />
          <Swatch name="Primary strong (text)" varName="--color-primary-strong" value="#a82449" note="Text on tint" />
          <Swatch name="Primary tint" varName="--color-primary-tint" value="#fff5f5" note="Control fill, never a background" />
          <Swatch name="Accent (blue)" varName="--color-accent" value="#1553b3" note="Structural, never an action" />
          <Swatch name="Accent strong" varName="--color-accent-strong" value="#0e3f8c" />
          <Swatch name="Accent tint" varName="--color-accent-tint" value="#eaf1fd" />
          <Swatch name="Success" varName="--color-success" value="#1a6e56" note="Functional only" />
          <Swatch name="Warning" varName="--color-warning" value="#8a5a0a" note="Functional only" />
          <Swatch name="Danger" varName="--color-danger" value="#a8121e" note="Tint + dot + word, never hue alone" />
        </div>
      </Section>

      <Section title="Categorical system palette" description="Medium-chroma, spine only (SystemChip), never a fill. Unknown systems fall back to neutral grey.">
        <div className="flex flex-wrap gap-2">
          {SYSTEM_NAMES.map((s) => (
            <SystemChip key={s} system={s} />
          ))}
          <SystemChip system="Unlisted system (fallback)" />
        </div>
      </Section>

      {/* ---- Type --------------------------------------------------------- */}
      <Section title="Type scale" description="Source Serif 4 for page titles, Geist for UI, Geist Mono (tabular figures) for data.">
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
          <h1 className="font-serif text-[26px] font-semibold text-ink">Page title — Source Serif 4, 26px</h1>
          <h2 className="font-serif text-[19px] font-semibold text-ink">Section title — Source Serif 4, 19px</h2>
          <div className="font-sans text-[13.5px] font-bold tracking-[-0.012em] text-ink">Panel title — Geist, 13.5px bold</div>
          <p className="text-[13.5px] leading-relaxed text-ink-2">Body copy — Geist, 13.5-15px, 1.55 line height.</p>
          <p className="font-mono text-[13px] tnum text-ink">1,204.50 mg/dL · 130/85 mmHg · 00:04:12</p>
        </div>
      </Section>

      {/* ---- Radii & shadows ---------------------------------------------- */}
      <Section title="Radius" description="6 / 8 / 10 / 12 / 16px — restrained, never pill-rounded cards.">
        <div className="flex flex-wrap gap-3">
          {(
            [
              ['sm', 'rounded-sm'],
              ['md', 'rounded-md'],
              ['lg', 'rounded-lg'],
              ['xl', 'rounded-xl'],
              ['2xl', 'rounded-2xl'],
            ] as const
          ).map(([label, className]) => (
            <div key={label} className={cn('flex size-16 items-center justify-center border border-line bg-surface-2 text-[11px] text-ink-2', className)}>
              {label}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation" description="Offset + soft blur only. No zero-offset halos, no glow.">
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['panel', 'shadow-panel'],
              ['raised', 'shadow-raised'],
              ['pop', 'shadow-pop'],
              ['control', 'shadow-control'],
              ['action', 'shadow-action'],
            ] as const
          ).map(([label, className]) => (
            <div key={label} className={cn('grid size-20 place-items-center rounded-xl border border-line bg-surface text-[11px] text-ink-2', className)}>
              {label}
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Motion --------------------------------------------------------- */}
      <Section title="Motion" description="100-250ms interface response; meters/instruments calibrate once on mount. Screen entrances animate transform only, never opacity. Everything respects prefers-reduced-motion.">
        <Panel className="p-5">
          <div className="mb-3 text-[12.5px] text-ink-2">Meter fill (mounts once):</div>
          <Meter value={68} className="max-w-sm" />
        </Panel>
      </Section>

      {/* ---- Button --------------------------------------------------------- */}
      <Section title="Button" description="primary (filled crimson) · tinted · ghost · danger — sizes sm/md/lg, loading and disabled states.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="tinted">Tinted</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
          <ButtonLink to="/styleguide" variant="tinted" iconRight={ChevronRight}>Link</ButtonLink>
          <IconButton icon={Search} label="Search" />
          <IconButton icon={Search} label="Search (tinted)" variant="tinted" />
        </div>
      </Section>

      {/* ---- Form ------------------------------------------------------- */}
      <Section title="Form fields">
        <div className="grid max-w-xl gap-4">
          <Field label="MRN" htmlFor="sg-mrn" hint="Unique per doctor">
            <Input id="sg-mrn" placeholder="DEMO-0007" />
          </Field>
          <Field label="Sex" htmlFor="sg-sex">
            <Select id="sg-sex" defaultValue="">
              <option value="" disabled>Choose one</option>
              <option value="F">F</option>
              <option value="M">M</option>
            </Select>
          </Field>
          <Field label="Note" htmlFor="sg-note" error="This field is required">
            <Textarea id="sg-note" invalid placeholder="Type or dictate the note…" />
          </Field>
        </div>
      </Section>

      {/* ---- Panel / Chip / Badge ------------------------------------------ */}
      <Section title="Panel">
        <Panel>
          <PanelHeader title="Panel title" hint="13.5px bold sans" icon={Calendar} action={<IconButton icon={Search} label="Search" size="sm" />} />
          <div className="p-4 text-[13.5px] text-ink-2">Panel body content.</div>
        </Panel>
      </Section>

      <Section title="Chip, Badge, StatusDot">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>Filter</Chip>
          <Chip active>Active filter</Chip>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="primary">Primary</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success" dot>Success</Badge>
          <Badge tone="warning" dot>Warning</Badge>
          <Badge tone="danger" dot>Danger</Badge>
          <StatusDot status="filled" />
          <StatusDot status="unclear" />
          <StatusDot status="empty" />
          <StatusDot status="draft" />
          <StatusDot status="final" />
        </div>
      </Section>

      {/* ---- Meter / RangeScale ------------------------------------------- */}
      <Section title="Meter & RangeScale">
        <div className="flex max-w-sm flex-col gap-4">
          <Meter value={30} tone="danger" />
          <Meter value={55} tone="warning" />
          <Meter value={85} tone="success" />
          <RangeScale value={68} zones={[{ label: 'Empty', upTo: 40 }, { label: 'Unclear', upTo: 70 }, { label: 'Filled', upTo: 100 }]} />
        </div>
      </Section>

      {/* ---- Tabs / Collapse ------------------------------------------------ */}
      <Section title="Tabs" description="One sliding indicator, measured from the active tab.">
        <Tabs
          items={[{ value: 'one', label: 'History', count: 4 }, { value: 'two', label: 'Examination', count: 2 }, { value: 'three', label: 'Operative' }]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="Collapse" description="Height is measured, not `auto` — a transition to auto does not animate.">
        <Panel className="p-4">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <ChevronRight size={15} className="chevron-turn" data-open={open} />
            Toggle
          </button>
          <Collapse open={open}>
            <p className="pt-3 text-[13px] text-ink-2">Disclosed content, measured height.</p>
          </Collapse>
        </Panel>
      </Section>

      {/* ---- Dialog / Popover / Tooltip / Toast ------------------------------- */}
      <Section title="Dialog, Popover, Tooltip, Toast">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Popover trigger={(p) => <Button {...p}>Open popover</Button>}>
            <button className="w-full rounded-md px-2.5 py-1.5 text-start text-[13px] hover:bg-inset">Item one</button>
            <button className="w-full rounded-md px-2.5 py-1.5 text-start text-[13px] hover:bg-inset">Item two</button>
          </Popover>
          <Tooltip label="A tooltip, never the only way to learn required information">
            <IconButton icon={AlertTriangle} label="Info" />
          </Tooltip>
          <Button onClick={() => toast('Encounter saved', 'success')}>Toast: success</Button>
          <Button onClick={() => toast('Could not save', 'danger')}>Toast: danger</Button>
        </div>
        {dialogOpen && (
          <Dialog onClose={() => setDialogOpen(false)} label="Example dialog">
            <div className="p-5">
              <h3 className="font-serif text-[18px] font-semibold text-ink">Example dialog</h3>
              <p className="mt-2 text-[13.5px] text-ink-2">Escape, focus trap and scroll lock are handled.</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>Confirm</Button>
              </div>
            </div>
          </Dialog>
        )}
      </Section>

      {/* ---- Skeleton / EmptyState / Kbd -------------------------------------- */}
      <Section title="Skeleton, EmptyState, Kbd">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-1/2" />
            <SkeletonText lines={2} />
            <SkeletonRow />
          </div>
          <Panel>
            <EmptyState icon={Inbox} title="No patients yet" description="Add one to get started." action={<Button variant="tinted">Add patient</Button>} />
          </Panel>
        </div>
        <p className="text-[13px] text-ink-2">
          Press <Kbd>&#8984;</Kbd> <Kbd>K</Kbd> to search.
        </p>
      </Section>

      {/* ---- DataTable -------------------------------------------------------- */}
      <Section title="DataTable" description="Dense, tabular figures, sortable, row hover without lift.">
        <Panel>
          <DataTable columns={DEMO_COLUMNS} rows={DEMO_ROWS} rowKey={(r) => String(r.id)} onRowClick={() => {}} />
        </Panel>
      </Section>
    </div>
  )
}
