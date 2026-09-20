import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Undo2 } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics'
import type { Bundle, Sheet } from '@/lib/types'
import { aggregateCounts, buildBundleForest, displayTitle, groupForest, orderedOpenBundles } from './bundleTree'
import { BundleSection } from './BundleSection'
import { NextToDocument } from './NextToDocument'
import { Inspector, QuestionBundle } from './QuestionBoard'
import { SheetMotionStyles } from './motion'

type LiveEvent = { id: number; kind: 'filled' | 'opened'; label: string; detail: string; more: number }

const settled = (state: string | undefined) => state === 'filled' || state === 'unclear'

/** Scrolls only the sheet's own scroller. `scrollIntoView` also drags every scrolling ancestor, which yanks the landing page. */
function scrollWithin(container: HTMLElement | null, el: Element | null | undefined, force = false) {
  if (!container || !el) return
  const cr = container.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  if (!force && er.top >= cr.top + 8 && er.bottom <= cr.bottom - 8) return
  container.scrollTo({ top: container.scrollTop + er.top - cr.top - cr.height / 3, behavior: 'smooth' })
}

export function RecordSheet({
  mode,
  bundles,
  sheet,
  openBundleIds,
  activeFieldKeys,
  onFieldHover,
  onEdit,
  onDismiss,
  onRestore,
  noteText = '',
  readOnly,
  pending,
  headerExtra,
  className,
}: {
  mode: 'clinical' | 'operative'
  bundles: Bundle[]
  sheet: Sheet
  openBundleIds: string[]
  activeFieldKeys: ReadonlySet<string>
  onFieldHover: (fieldKey: string | null) => void
  onEdit: (fieldKey: string, value: string) => void
  onDismiss: (fieldKey: string) => void
  onRestore: (fieldKey: string) => void
  /** The note itself, so the inspector can quote the clause a value came from. */
  noteText?: string
  readOnly?: boolean
  /** An analysis is in flight: the header shows a scanning hairline. */
  pending?: boolean
  headerExtra?: ReactNode
  className?: string
}) {
  const openBundles = orderedOpenBundles(openBundleIds, bundles)
  const forest = buildBundleForest(openBundles)
  const sections = groupForest(mode, forest)
  const counts = aggregateCounts(openBundles, sheet)
  const idle = !noteText.trim() && counts.filled === 0 && counts.unclear === 0

  const scrollRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLElement>())
  const prevOpen = useRef<string[]>(openBundleIds)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [pulseKey, setPulseKey] = useState<string | null>(null)
  // Questions: what is still owed, answers on hover. Record: every value written out and editable in place.
  const [view, setView] = useState<'questions' | 'record'>(readOnly ? 'record' : 'questions')
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const inspectorEditing = useRef(false)

  function hover(fieldKey: string | null) {
    if (!inspectorEditing.current) setHoveredKey(fieldKey)
    onFieldHover(fieldKey)
  }

  function registerRef(bundleId: string, el: HTMLElement | null) {
    if (el) nodeRefs.current.set(bundleId, el)
    else nodeRefs.current.delete(bundleId)
  }

  function isOffscreen(id: string) {
    const container = scrollRef.current
    const el = nodeRefs.current.get(id)
    if (!container || !el) return true
    const cr = container.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    return er.bottom < cr.top || er.top > cr.bottom
  }

  // The sheet follows the writing: while the doctor's hands are on the note,
  // whatever just opened or filled is brought into view. The moment the
  // pointer or focus is inside the sheet it holds still, and anything new
  // below the fold is announced by the "N new sections" pill instead.
  const holding = useRef(false)
  const prevSheet = useRef(sheet)
  const eventId = useRef(0)
  const [live, setLive] = useState<LiveEvent | null>(null)

  useEffect(() => {
    const added = openBundleIds.filter((id) => !prevOpen.current.includes(id))
    const before = prevSheet.current
    const fresh = Object.keys(sheet).filter((k) => sheet[k].source !== 'doctor' && settled(sheet[k].state) && !settled(before[k]?.state))
    prevOpen.current = openBundleIds
    prevSheet.current = sheet
    if (!added.length && !fresh.length) return

    const byId = new Map(bundles.map((b) => [b.id, b]))
    if (fresh.length) {
      const key = fresh[fresh.length - 1]
      const [bundleId, itemId] = key.split('.')
      const item = byId.get(bundleId)?.items.find((i) => i.id === itemId)
      const entry = sheet[key]
      const value = entry.state === 'unclear' ? 'unclear' : `${entry.value ?? ''}${entry.unit ? ` ${entry.unit}` : ''}`
      setLive({ id: ++eventId.current, kind: 'filled', label: item?.label ?? key, detail: value, more: fresh.length - 1 })
    } else {
      const bundle = byId.get(added[added.length - 1])
      if (bundle) setLive({ id: ++eventId.current, kind: 'opened', label: displayTitle(bundle.title), detail: `${bundle.items.length} questions`, more: added.length - 1 })
    }

    requestAnimationFrame(() => {
      if (holding.current) {
        const off = added.filter(isOffscreen)
        if (off.length) setPendingIds((prev) => [...new Set([...prev, ...off])])
        return
      }
      if (fresh.length > 4 || added.length > 2) return
      const target = added.length ? nodeRefs.current.get(added[0]) : document.getElementById(`field-${fresh[0]}`)
      scrollWithin(scrollRef.current, target)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBundleIds, sheet])

  function handleScroll() {
    if (!pendingIds.length) return
    setPendingIds((prev) => prev.filter(isOffscreen))
  }

  function jumpTo(fieldKey: string) {
    scrollWithin(scrollRef.current, document.getElementById(`field-${fieldKey}`), true)
    setPulseKey(fieldKey)
    setTimeout(() => setPulseKey(null), 650)
  }

  const [undoNotice, setUndoNotice] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function dismiss(fieldKey: string) {
    onDismiss(fieldKey)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoNotice(fieldKey)
    undoTimer.current = setTimeout(() => setUndoNotice(null), 5000)
  }

  function undo() {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    if (undoNotice) onRestore(undoNotice)
    setUndoNotice(null)
  }

  return (
    <div
      className={cn('relative flex min-h-0 flex-col bg-surface', className)}
      onPointerEnter={() => (holding.current = true)}
      onPointerLeave={() => (holding.current = false)}
      onFocusCapture={() => (holding.current = true)}
      onBlurCapture={() => (holding.current = false)}
    >
      <SheetMotionStyles />
      <div className="relative flex flex-col gap-2.5 border-b border-line bg-surface px-5 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[17px] font-semibold text-ink">Record sheet</h2>
            <div className="mt-0.5 h-[18px] overflow-hidden text-[12.5px]" aria-live="polite">
              {live ? (
                <p key={live.id} className="animate-screen-in flex min-w-0 items-center gap-1.5 text-ink-2">
                  <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', live.kind === 'filled' ? 'bg-accent' : 'bg-primary')} />
                  <span className="shrink-0 font-medium text-ink">{live.label}</span>
                  <span className="truncate">
                    {live.kind === 'filled' ? live.detail : `opened · ${live.detail}`}
                    {live.more > 0 && ` · and ${live.more} more`}
                  </span>
                </p>
              ) : (
                <p className="text-ink-3">{idle ? 'Waiting for the note.' : 'Up to date with the note.'}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <div role="tablist" aria-label="Sheet view" className="flex rounded-md border border-line bg-surface-2 p-0.5">
              {(['questions', 'record'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => {
                    setView(v)
                    track('sheet_view', { view: v })
                  }}
                  className={cn(
                    'h-6 rounded-[5px] px-2.5 text-[12px] font-medium capitalize transition-colors',
                    view === v ? 'bg-surface text-ink shadow-raised' : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            {headerExtra}
          </div>
        </div>
        <Tally counts={counts} idle={idle} />
        {pending && (
          <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
            <span className="cn-scan block h-full w-1/3 bg-accent" />
          </span>
        )}
      </div>

      {view === 'record' && <NextToDocument openBundles={openBundles} sheet={sheet} onJumpTo={jumpTo} />}

      <div ref={scrollRef} onScroll={handleScroll} className="@container relative min-h-0 flex-1 overflow-y-auto bg-paper px-5 py-4">
        <div className="flex flex-col gap-7">
          {sections.map(
            (section) =>
              section.nodes.length > 0 && (
                <div key={section.title} className="flex flex-col gap-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{section.title}</h3>
                  {/* Two columns once the sheet is wide enough to waste a single one. */}
                  <div className="gap-x-10 @[700px]:columns-2 [&>*]:mb-5">
                    {section.nodes.map((node) =>
                      view === 'questions' ? (
                        <QuestionBundle
                          key={node.bundle.id}
                          node={node}
                          sheet={sheet}
                          activeFieldKeys={activeFieldKeys}
                          selectedKey={selectedKey}
                          onHover={hover}
                          onSelect={(k) => setSelectedKey((cur) => (cur === k ? null : k))}
                          registerRef={registerRef}
                          idle={idle}
                        />
                      ) : (
                        <BundleSection
                          key={node.bundle.id}
                          node={node}
                          allBundles={bundles}
                          sheet={sheet}
                          activeFieldKeys={activeFieldKeys}
                          pulseKey={pulseKey}
                          onFieldHover={onFieldHover}
                          onEdit={onEdit}
                          onDismiss={dismiss}
                          readOnly={readOnly}
                          registerRef={registerRef}
                        />
                      ),
                    )}
                  </div>
                </div>
              ),
          )}
          {counts.total === 0 && (
            <p className="px-1 py-10 text-center text-[13px] text-ink-3">
              Start typing or dictating the note — the sheet fills in as you go.
            </p>
          )}
        </div>

        {pendingIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const first = pendingIds[0]
              scrollWithin(scrollRef.current, nodeRefs.current.get(first), true)
              setPendingIds([])
            }}
            className="sticky inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-2 shadow-raised hover:text-ink"
          >
            {pendingIds.length} new section{pendingIds.length > 1 ? 's' : ''}
            <Icon icon={ChevronDown} size={13} />
          </button>
        )}
      </div>

      {view === 'questions' && (
        <Inspector
          fieldKey={hoveredKey ?? selectedKey}
          bundles={bundles}
          sheet={sheet}
          noteText={noteText}
          readOnly={readOnly}
          onEdit={onEdit}
          onDismiss={dismiss}
          onRestore={onRestore}
          onEditingChange={(e) => {
            inspectorEditing.current = e
            if (e) setHoveredKey(null)
          }}
        />
      )}

      {undoNotice && (
        <div
          role="status"
          className="animate-pop absolute inset-x-0 bottom-3 z-20 mx-auto flex w-fit items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink shadow-pop"
        >
          <span>Marked not relevant</span>
          <button type="button" onClick={undo} className="inline-flex items-center gap-1 font-semibold text-primary-strong hover:text-primary">
            <Icon icon={Undo2} size={13} />
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

/** Filled / unclear / empty as one proportional bar. Blue is answered, crimson is still owed. */
function Tally({ counts, idle }: { counts: { filled: number; unclear: number; empty: number; total: number }; idle?: boolean }) {
  const share = (n: number) => (counts.total === 0 ? 0 : (n / counts.total) * 100)
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-inset">
        <span className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${share(counts.filled)}%` }} />
        <span className="h-full bg-ink-3/50 transition-[width] duration-500 ease-out" style={{ width: `${share(counts.unclear)}%` }} />
      </div>
      {idle ? (
        <p className="mt-1.5 text-[12px] text-ink-2">
          <b className="tnum font-semibold text-ink">{counts.total}</b> questions every note gets. More appear as you write.
        </p>
      ) : (
      <div className="mt-1.5 flex flex-wrap gap-x-4 text-[12px] text-ink-2">
        <span className="tnum"><b className="font-semibold text-ink">{counts.filled}</b> filled</span>
        {counts.unclear > 0 && <span className="tnum"><b className="font-semibold text-ink">{counts.unclear}</b> unclear</span>}
        <span className="tnum">
          <b className={cn('font-semibold', counts.empty > 0 ? 'text-primary-strong' : 'text-ink')}>{counts.empty}</b> still to document
        </span>
      </div>
      )}
    </div>
  )
}
