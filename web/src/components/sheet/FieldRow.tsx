import { useEffect, useRef, useState } from 'react'
import { Link2, Pencil, X } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Tooltip } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import type { Bundle, Item, Sheet } from '@/lib/types'

type FieldEntry = Sheet[string]

/**
 * One item of one bundle, rendered as a definition-grid row. Every state the
 * Display research brief calls for is a distinct shape, never colour alone:
 * empty is a ruled blank with a crimson tick, unclear is a dashed rule plus
 * the word, filled-by-Jev carries a blue source dot, doctor-edited carries a
 * pen mark instead, dismissed is struck through.
 */
export function FieldRow({
  fieldKey,
  item,
  entry,
  linkTarget,
  active,
  pulse,
  readOnly,
  onHoverChange,
  onEdit,
  onDismiss,
}: {
  fieldKey: string
  item: Item
  entry: FieldEntry | undefined
  linkTarget?: Bundle
  active: boolean
  pulse?: boolean
  readOnly?: boolean
  onHoverChange: (hovering: boolean) => void
  onEdit: (value: string) => void
  onDismiss: () => void
}) {
  const state = entry?.state ?? 'empty'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [sweep, setSweep] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevState = useRef(state)

  useEffect(() => {
    const wasSettled = prevState.current === 'filled' || prevState.current === 'unclear'
    const nowSettled = state === 'filled' || state === 'unclear'
    prevState.current = state
    if (!wasSettled && nowSettled) {
      setSweep(true)
      const t = setTimeout(() => setSweep(false), 1600)
      return () => clearTimeout(t)
    }
  }, [state])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function beginEdit() {
    if (readOnly || state === 'dismissed') return
    setDraft(entry?.value ?? '')
    setEditing(true)
  }

  function commit(value?: string) {
    setEditing(false)
    onEdit(value ?? draft)
  }

  return (
    <div
      id={`field-${fieldKey}`}
      data-field-key={fieldKey}
      tabIndex={readOnly ? undefined : 0}
      role="group"
      aria-label={item.label}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      onKeyDown={(e) => {
        if (readOnly || editing) return
        if ((e.key === 'Backspace' || e.key === 'Delete') && state !== 'dismissed') {
          e.preventDefault()
          onDismiss()
        }
      }}
      className={cn(
        'group/field relative grid grid-cols-[minmax(108px,38%)_1fr] items-start gap-x-3 gap-y-0.5 break-inside-avoid rounded-md py-1.5 ps-3 pe-1.5 outline-none transition-colors duration-700',
        (active || sweep) && 'bg-accent-tint/60',
        !active && !sweep && 'hover:bg-surface-2/70 focus-visible:bg-surface-2/70',
        pulse && 'cn-pulse-scale',
      )}
    >
      {/* The empty-field cue: a small crimson tick at the left margin. */}
      {state === 'empty' && (
        <span aria-hidden className="absolute start-0 top-1/2 h-2.5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
      )}

      <div className="flex min-w-0 items-center gap-1 pt-0.5 text-[12.5px] text-ink-2">
        <span className="truncate">{item.label}</span>
        {item.link && (
          <Tooltip label={item.reason ?? `Also opens “${linkTarget?.title ?? item.link}”`}>
            <span className="inline-flex text-accent">
              <Icon icon={Link2} size={12} />
            </span>
          </Tooltip>
        )}
      </div>

      <div className="min-w-0">
        {editing ? (
          <EditControl item={item} draft={draft} setDraft={setDraft} onCommit={commit} onCancel={() => setEditing(false)} inputRef={inputRef} />
        ) : (
          <div className="flex min-w-0 items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <ValueDisplay
                item={item}
                entry={entry}
                state={state}
                expanded={expanded}
                sweep={sweep}
                onClick={() => {
                  if (readOnly) return
                  if (state === 'filled' && entry?.source === 'jev' && item.type === 'text') {
                    setExpanded((v) => !v)
                  } else if (state !== 'dismissed') {
                    beginEdit()
                  }
                }}
              />
            </div>
            {!readOnly && state !== 'dismissed' && (
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-within/field:opacity-100">
                {state === 'filled' && entry?.source === 'jev' && item.type === 'text' && (
                  <IconButton icon={Pencil} label="Edit" size="sm" onClick={beginEdit} />
                )}
                <IconButton icon={X} label="Not relevant" size="sm" onClick={onDismiss} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function EditControl({
  item,
  draft,
  setDraft,
  onCommit,
  onCancel,
  inputRef,
}: {
  item: Item
  draft: string
  setDraft: (v: string) => void
  onCommit: (value?: string) => void
  onCancel: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  if (item.type === 'presence') {
    return (
      <div className="flex gap-1.5">
        {(['Present', 'Absent'] as const).map((option) => (
          <button
            key={option}
            type="button"
            autoFocus={option === 'Present'}
            onClick={() => onCommit(option)}
            className="h-7 rounded-md border border-line-2 bg-surface px-2.5 text-[12.5px] font-medium text-ink hover:border-primary hover:text-primary-strong"
          >
            {option}
          </button>
        ))}
        <button type="button" onClick={onCancel} className="h-7 rounded-md px-2 text-[12.5px] text-ink-3 hover:text-ink-2">
          Cancel
        </button>
      </div>
    )
  }
  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onCommit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      onBlur={() => onCommit()}
      placeholder={item.phrase}
      className="h-7 w-full rounded-md border border-primary bg-surface px-2 text-[13.5px] text-ink outline-none ring-[var(--ring-field)] focus:ring-2"
    />
  )
}

function ValueDisplay({
  item,
  entry,
  state,
  expanded,
  sweep,
  onClick,
}: {
  item: Item
  entry: FieldEntry | undefined
  state: string
  expanded: boolean
  sweep: boolean
  onClick: () => void
}) {
  if (state === 'dismissed') {
    return (
      <button type="button" onClick={onClick} className="text-[13px] text-ink-3 line-through decoration-line-2 italic">
        Not relevant
      </button>
    )
  }

  if (state === 'empty') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Document ${item.label.toLowerCase()}`}
        className="block h-6 w-full border-b border-line-2 text-start"
      />
    )
  }

  if (state === 'unclear') {
    return (
      <button type="button" onClick={onClick} className="flex h-6 w-full items-end border-b border-dashed border-line-2 text-start">
        <span className="pb-0.5 text-[12.5px] italic text-ink-3">unclear</span>
      </button>
    )
  }

  // filled
  const sourceMark =
    entry?.source === 'doctor' ? (
      <Icon icon={Pencil} size={11} className="mt-[3px] shrink-0 text-ink-3" />
    ) : (
      <span aria-hidden className="mt-[7px] size-[5px] shrink-0 rounded-full bg-accent" />
    )

  let content: React.ReactNode
  if (item.type === 'presence') {
    content = (
      <span className="inline-flex h-5 items-center rounded border border-line-2 bg-surface-2 px-1.5 text-[11.5px] font-medium text-ink">
        {entry?.value ?? '—'}
      </span>
    )
  } else if (item.type === 'text') {
    content = (
      <span className={cn('block text-[13.5px] text-ink', !expanded && 'line-clamp-2')}>
        {entry?.value}
      </span>
    )
  } else {
    content = (
      <span className="font-mono text-[13px] tnum text-ink">
        {entry?.value}
        {entry?.unit ? <span className="ms-1 text-ink-3">{entry.unit}</span> : null}
      </span>
    )
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-start">
      <span className="flex items-start gap-1.5">
        {sourceMark}
        <span className="min-w-0 flex-1">{content}</span>
      </span>
      <span className={cn('mt-0.5 block h-px w-full origin-left bg-line-2', sweep && 'cn-ink-settle bg-accent')} aria-hidden />
    </button>
  )
}
