import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Tooltip } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import type { UseDictationResult } from '@/lib/useDictation'
import { triggerStyle, type TriggerMark } from '@/components/sheet/triggerColor'
import { splitSentences } from './sentences'

const PANE_TEXT = 'font-sans text-[16px] leading-[1.6] sm:leading-[1.75] whitespace-pre-wrap break-words'

/**
 * A sheet of paper: mirrored-backdrop technique (a positioned div behind a
 * transparent-background textarea, same font metrics and scroll sync) so
 * evidence sentences can be highlighted without a rich-text editor. Resting
 * state carries no highlight; a field lights its sentence, and hovering a
 * sentence lights the fields it filled (see Workspace, which owns that link).
 */
export function NotePane({
  text,
  onTextChange,
  activeSentence,
  onHoverSentence,
  marks = [],
  readOnly,
  dictation,
  statusText,
  statusTone = 'neutral',
  className,
}: {
  text: string
  onTextChange: (text: string) => void
  activeSentence: number | null
  onHoverSentence: (index: number | null) => void
  /** The words that opened a question set, each in the colour its set wears on the sheet. */
  marks?: TriggerMark[]
  readOnly?: boolean
  dictation: UseDictationResult
  statusText?: string
  statusTone?: 'neutral' | 'error'
  className?: string
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const spanRefs = useRef(new Map<number, HTMLSpanElement>())
  const lastHover = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const sentences = splitSentences(text)

  function handleScroll() {
    if (backdropRef.current && textareaRef.current) backdropRef.current.scrollTop = textareaRef.current.scrollTop
  }

  function reportHover(index: number | null) {
    if (lastHover.current === index) return
    lastHover.current = index
    onHoverSentence(index)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLTextAreaElement>) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const x = e.clientX
    const y = e.clientY
    rafRef.current = requestAnimationFrame(() => {
      for (const [index, span] of spanRefs.current) {
        const rects = span.getClientRects()
        for (const r of rects) {
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            reportHover(index)
            return
          }
        }
      }
      reportHover(null)
    })
  }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // Text that arrives without the keyboard (dictation, the example playing) keeps its last line in view.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta || document.activeElement === ta) return
    ta.scrollTop = ta.scrollHeight
    if (backdropRef.current) backdropRef.current.scrollTop = ta.scrollTop
  }, [text])

  return (
    <div className={cn('flex min-h-0 flex-col bg-surface', className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={backdropRef}
          aria-hidden
          className={cn(PANE_TEXT, 'pointer-events-none absolute inset-0 overflow-y-auto p-4 text-ink sm:p-8')}
        >
          {sentences.length === 0 && !text ? (
            <span className="text-ink-3">
              Type or dictate the note here. The questions on the right tick themselves off as you write.
            </span>
          ) : (
            sentences.map((s, i) => (
              <span
                key={i}
                ref={(el) => {
                  if (el) spanRefs.current.set(i, el)
                  else spanRefs.current.delete(i)
                }}
                className={cn('rounded-[3px] transition-colors', activeSentence === i && 'bg-accent-tint')}
              >
                {paint(text, s.start, s.end, marks)}
              </span>
            ))
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onScroll={handleScroll}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => reportHover(null)}
          readOnly={readOnly}
          spellCheck={false}
          placeholder=""
          className={cn(
            PANE_TEXT,
            'absolute inset-0 resize-none bg-transparent p-4 text-transparent caret-ink outline-none sm:p-8',
          )}
          aria-label="Clinical note"
        />
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-1.5 sm:px-8 sm:py-2.5">
        <DictateButton dictation={dictation} disabled={readOnly} />
        {dictation.listening && dictation.interim && (
          <span className="min-w-0 flex-1 truncate text-[13px] italic text-ink-3">{dictation.interim}</span>
        )}
        <span
          className={cn(
            'ms-auto shrink-0 font-mono text-[11px] tnum max-sm:hidden',
            statusTone === 'error' ? 'text-danger' : 'text-ink-3',
          )}
        >
          {statusText}
        </span>
      </div>
    </div>
  )
}

/**
 * Cuts [from, to) wherever a mark starts or stops. Where marks nest ("pain"
 * inside "epigastric pain") the shorter one wins, so both stay visible.
 */
function paint(text: string, from: number, to: number, marks: TriggerMark[]) {
  const inside = marks.filter((m) => m.start < to && m.end > from)
  if (!inside.length) return text.slice(from, to)
  const cuts = [...new Set([from, to, ...inside.flatMap((m) => [Math.max(from, m.start), Math.min(to, m.end)])])].sort((a, b) => a - b)
  return cuts.slice(0, -1).map((a, i) => {
    const b = cuts[i + 1]
    const cover = inside.filter((m) => m.start <= a && m.end >= b).sort((x, y) => x.end - x.start - (y.end - y.start))[0]
    return cover ? (
      <mark key={a} style={triggerStyle(cover.hue)}>
        {text.slice(a, b)}
      </mark>
    ) : (
      text.slice(a, b)
    )
  })
}

function DictateButton({ dictation, disabled }: { dictation: UseDictationResult; disabled?: boolean }) {
  const button = (
    <button
      type="button"
      disabled={disabled || !dictation.supported}
      onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        dictation.listening
          ? 'border-primary-line bg-primary-tint text-primary-strong'
          : 'border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink',
      )}
    >
      <Icon icon={dictation.listening ? Mic : MicOff} size={13} className={dictation.listening ? 'text-primary' : undefined} />
      {dictation.listening ? 'Listening' : 'Dictate'}
    </button>
  )
  if (!dictation.supported) {
    return <Tooltip label="Dictation isn't supported in this browser.">{button}</Tooltip>
  }
  if (dictation.error) {
    return <Tooltip label={dictation.error}>{button}</Tooltip>
  }
  return button
}
