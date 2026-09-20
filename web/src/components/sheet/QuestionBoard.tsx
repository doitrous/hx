import { useEffect, useRef, useState } from 'react'
import { Check, CornerDownRight, Pencil, Undo2, X } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Ticks } from '@/components/ui/Meter'
import { systemColor } from '@/lib/systems'
import { cn } from '@/lib/cn'
import type { Bundle, Item, Sheet } from '@/lib/types'
import { countBundleItems, displayTitle, type BundleNode } from './bundleTree'
import { CaughtTitle } from './CaughtTitle'
import { EditControl } from './FieldRow'

type FieldEntry = Sheet[string]

const ORDER: Record<string, number> = { empty: 0, unclear: 1, filled: 2, dismissed: 3 }

/**
 * The questions-first view of the sheet. What the note still owes is the
 * loudest thing on screen; what it has already answered recedes to a tick.
 * The words taken from the note are never printed here: hovering or selecting
 * a question shows them in the inspector and lights their sentence in the note.
 */
export function QuestionBundle({
  node,
  sheet,
  activeFieldKeys,
  selectedKey,
  onHover,
  onSelect,
  registerRef,
  caught = {},
  idle,
  depth = 0,
}: {
  node: BundleNode
  /** Nothing written yet: questions wait quietly instead of demanding. */
  idle?: boolean
  sheet: Sheet
  activeFieldKeys: ReadonlySet<string>
  selectedKey: string | null
  onHover: (fieldKey: string | null) => void
  onSelect: (fieldKey: string) => void
  registerRef: (bundleId: string, el: HTMLElement | null) => void
  /** The phrase of the note that opened each bundle, and its colour. */
  caught?: Record<string, { hue: string; phrase: string }>
  depth?: number
}) {
  const { bundle, parents, children } = node
  const { filled, unclear, empty, total } = countBundleItems(node, sheet)
  const done = total > 0 && empty === 0 && unclear === 0
  const items = bundle.items
    .map((item, index) => ({ item, index, key: `${bundle.id}.${item.id}` }))
    .sort((a, b) => (ORDER[sheet[a.key]?.state ?? 'empty'] - ORDER[sheet[b.key]?.state ?? 'empty']) || a.index - b.index)

  return (
    <div
      ref={(el) => registerRef(bundle.id, el)}
      data-bundle-id={bundle.id}
      className={cn('animate-screen-in flex flex-col gap-2 py-1.5', depth === 0 && 'ps-3.5', children.length === 0 && 'break-inside-avoid')}
      style={depth === 0 ? { boxShadow: `inset 3px 0 0 0 ${systemColor(bundle.system)}` } : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        {depth > 0 && parents[0] && (
          <span title={parents[0].item.reason ?? undefined} className="inline-flex items-center gap-1 text-[11.5px] text-ink-3">
            <Icon icon={CornerDownRight} size={12} />
            {displayTitle(parents[0].bundle.title)}
          </span>
        )}
        <h3 className={cn('font-sans text-[13.5px] font-bold tracking-[-0.012em]', done ? 'text-ink-2' : 'text-ink')}><CaughtTitle title={displayTitle(bundle.title)} caught={caught[bundle.id]} /></h3>
        {done ? (
          <span className="animate-screen-in inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
            <Icon icon={Check} size={13} />
            Complete
          </span>
        ) : (
          <>
            <span className="tnum font-mono text-[11.5px] text-ink-3">
              {idle ? `${total} questions` : `${empty + unclear} left`}
            </span>
            <Ticks filled={filled} unclear={unclear} total={total} />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-x-1.5 gap-y-1.5">
        {items.map(({ item, key }) => (
          <QuestionChip
            key={key}
            fieldKey={key}
            item={item}
            entry={sheet[key]}
            active={activeFieldKeys.has(key)}
            selected={selectedKey === key}
            idle={idle}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </div>

      {children.length > 0 && (
        <div className="ms-1 mt-1 flex flex-col gap-3 border-s-2 border-line ps-4">
          {children.map((child) => (
            <QuestionBundle
              key={child.bundle.id}
              node={child}
              sheet={sheet}
              activeFieldKeys={activeFieldKeys}
              selectedKey={selectedKey}
              onHover={onHover}
              onSelect={onSelect}
              registerRef={registerRef}
              caught={caught}
              idle={idle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionChip({
  fieldKey,
  item,
  entry,
  active,
  selected,
  idle,
  onHover,
  onSelect,
}: {
  idle?: boolean
  fieldKey: string
  item: Item
  entry: FieldEntry | undefined
  active: boolean
  selected: boolean
  onHover: (fieldKey: string | null) => void
  onSelect: (fieldKey: string) => void
}) {
  const state = entry?.state ?? 'empty'
  const prev = useRef(state)
  const [fresh, setFresh] = useState(false)

  // The moment a question ticks itself off, it holds a blue wash before receding.
  useEffect(() => {
    const was = prev.current
    prev.current = state
    if (was !== 'filled' && state === 'filled') {
      setFresh(true)
      const t = setTimeout(() => setFresh(false), 1600)
      return () => clearTimeout(t)
    }
  }, [state])

  return (
    <button
      id={`field-${fieldKey}`}
      type="button"
      aria-pressed={selected}
      onMouseEnter={() => onHover(fieldKey)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(fieldKey)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(fieldKey)}
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-[12.5px] outline-none transition-colors duration-500 pointer-coarse:h-9 pointer-coarse:px-3 pointer-coarse:text-[13.5px]',
        'focus-visible:ring-2 focus-visible:ring-[var(--ring-field)]',
        state === 'empty' && (idle ? 'border-line bg-surface text-ink-2 hover:border-line-2' : 'border-line-2 bg-surface font-medium text-ink hover:border-primary-line'),
        state === 'unclear' && 'border-dashed border-line-2 bg-surface font-medium text-ink-2 hover:border-primary-line',
        state === 'filled' && 'border-transparent text-ink-3 hover:bg-accent-tint/60 hover:text-ink',
        state === 'dismissed' && 'border-transparent text-ink-3 line-through decoration-line-2 hover:text-ink-2',
        (active || fresh) && state === 'filled' && 'bg-accent-tint/70 text-ink',
        selected && 'border-ink-3 text-ink',
      )}
    >
      {state === 'empty' && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full transition-colors duration-500', idle ? 'bg-line-2' : 'bg-primary')} />}
      {state === 'unclear' && <span aria-hidden className="font-mono text-[11px] text-ink-3">?</span>}
      {state === 'filled' &&
        (entry?.source === 'doctor' ? (
          <Icon icon={Pencil} size={11} className="shrink-0 text-ink-3" />
        ) : (
          <Icon icon={Check} size={12} className={cn('shrink-0 text-accent', fresh && 'cn-tick-in')} />
        ))}
      <span className="truncate">{item.label}</span>
    </button>
  )
}

/**
 * Pinned to the foot of the sheet, so it never covers a question and is never
 * clipped by the scroller. Hover previews; a click pins, which is also how
 * touch and keyboard reach the same information.
 */
export function Inspector({
  fieldKey,
  bundles,
  sheet,
  noteText,
  readOnly,
  onEdit,
  onDismiss,
  onRestore,
  onEditingChange,
}: {
  fieldKey: string | null
  bundles: Bundle[]
  sheet: Sheet
  noteText: string
  readOnly?: boolean
  onEdit: (fieldKey: string, value: string) => void
  onDismiss: (fieldKey: string) => void
  onRestore: (fieldKey: string) => void
  onEditingChange: (editing: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditing(false)
    onEditingChange(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!fieldKey) {
    return (
      <div className="border-t border-line bg-surface-2/60 px-5 py-3 text-[12.5px] text-ink-3">
        Point at a question to see what was taken from the note. Select one to answer it yourself.
      </div>
    )
  }

  const [bundleId, itemId] = fieldKey.split('.')
  const bundle = bundles.find((b) => b.id === bundleId)
  const item = bundle?.items.find((i) => i.id === itemId)
  if (!bundle || !item) return null
  const entry = sheet[fieldKey]
  const state = entry?.state ?? 'empty'
  const quote = entry?.evidence ? noteText.slice(entry.evidence.start, entry.evidence.end).trim() : ''
  const value = entry?.value ? `${entry.value}${entry.unit ? ` ${entry.unit}` : ''}` : ''
  const showValue = state === 'filled' && value && value.trim() !== quote

  function begin() {
    setDraft(entry?.value ?? '')
    setEditing(true)
    onEditingChange(true)
  }
  function stop() {
    setEditing(false)
    onEditingChange(false)
  }

  return (
    <div key={fieldKey} className="border-t border-line bg-surface-2/60 px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            {displayTitle(bundle.title)} · {item.label}
          </p>
          {editing ? (
            <div className="mt-1.5 max-w-md">
              <EditControl
                item={item}
                draft={draft}
                setDraft={setDraft}
                inputRef={inputRef}
                onCancel={stop}
                onCommit={(v) => {
                  stop()
                  onEdit(fieldKey, v ?? draft)
                }}
              />
            </div>
          ) : state === 'filled' ? (
            <div className="animate-screen-in mt-1">
              {showValue && <p className="font-mono text-[14px] tnum text-ink">{value}</p>}
              {quote ? (
                <p className="line-clamp-2 font-serif text-[14px] leading-snug text-ink">“{quote}”</p>
              ) : (
                !showValue && <p className="text-[13.5px] text-ink">{value}</p>
              )}
              <p className="mt-0.5 text-[11.5px] text-ink-3">{entry?.source === 'doctor' ? 'Entered by you. It will not be overwritten.' : 'Copied from the note.'}</p>
            </div>
          ) : state === 'dismissed' ? (
            <p className="mt-1 text-[13px] text-ink-2">Marked not relevant.</p>
          ) : (
            <p className="mt-1 text-[13px] text-ink-2">
              {state === 'unclear' ? 'The note touches on this, but not clearly. ' : 'Not in the note yet. '}
              <span className="text-ink-3">Looking for {item.phrase.replace(/,?\s*or (?:its|their) absence$/i, '')}.</span>
            </p>
          )}
        </div>
        {!readOnly && !editing && (
          <div className="flex shrink-0 items-center gap-1.5">
            {state === 'dismissed' ? (
              <InspectorAction icon={Undo2} label="Undo" onClick={() => onRestore(fieldKey)} />
            ) : (
              <>
                <InspectorAction icon={Pencil} label={state === 'filled' ? 'Edit' : 'Answer'} onClick={begin} />
                <InspectorAction icon={X} label="Not relevant" onClick={() => onDismiss(fieldKey)} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InspectorAction({ icon, label, onClick }: { icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
    >
      <Icon icon={icon} size={12} />
      {label}
    </button>
  )
}
