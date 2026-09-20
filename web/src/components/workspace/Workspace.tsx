import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import { RecordSheet } from '@/components/sheet/RecordSheet'
import { colourTriggers } from '@/components/sheet/triggerColor'
import { aggregateCounts, orderedOpenBundles } from '@/components/sheet/bundleTree'
import { cn } from '@/lib/cn'
import { useAnalyze } from '@/lib/useAnalyze'
import { useDictation } from '@/lib/useDictation'
import type { AnalyzeResponse, Bundle, Sheet } from '@/lib/types'
import { NotePane } from './NotePane'
import { sentenceIndexForRange, splitSentences } from './sentences'

export type WorkspaceHandle = {
  /** Drives text in imperatively — used by the demo landing's "type an example" control. */
  setText: (text: string) => void
  /** Recorded-example playback: no request is made while replaying is on. */
  setReplaying: (on: boolean) => void
  applyResponse: (res: Pick<AnalyzeResponse, 'bundles' | 'fields'>, sourceText: string) => void
}

export type WorkspaceProps = {
  mode: 'clinical' | 'operative'
  bundles: Bundle[]
  /** Use client.demoAnalyze (public, nothing stored) instead of client.analyze. */
  demo?: boolean
  patientId?: string
  initialText?: string
  initialSheet?: Sheet
  initialOpenBundles?: string[]
  /** A finalized encounter: the note and every field become read-only. */
  readOnly?: boolean
  /** Product-only chrome (autosave state, Finalize button) rendered into the sheet header. */
  headerExtra?: ReactNode
  onChange?: (state: { text: string; sheet: Sheet; counts: { filled: number; unclear: number; empty: number; total: number } }) => void
  className?: string
}

/**
 * The screen itself: note pane + record sheet, wired together. Owns the
 * hover link between them (a field lights its evidence sentence; a sentence
 * lights the fields it filled) and the analysis/dictation hooks. Shared by
 * the product encounter page and the public demo landing.
 */
export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(function Workspace(
  { mode, bundles, demo, patientId, initialText, initialSheet, initialOpenBundles, readOnly, headerExtra, onChange, className },
  ref,
) {
  const analyze = useAnalyze({ mode, bundles, demo, patientId, initialText, initialSheet, initialOpenBundles })
  const dictation = useDictation((chunk) => {
    if (readOnly) return
    analyze.setReplaying(false)
    analyze.setText(analyze.text.length && !/\s$/.test(analyze.text) ? `${analyze.text} ${chunk}` : `${analyze.text}${chunk}`)
  })

  useImperativeHandle(
    ref,
    () => ({ setText: analyze.setText, setReplaying: analyze.setReplaying, applyResponse: analyze.applyResponse }),
    [analyze.setText, analyze.setReplaying, analyze.applyResponse],
  )

  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [hoveredSentence, setHoveredSentence] = useState<number | null>(null)

  const sentences = useMemo(() => splitSentences(analyze.text), [analyze.text])

  const activeSentenceIndex = useMemo(() => {
    if (hoveredSentence !== null) return hoveredSentence
    if (hoveredField) {
      const evidence = analyze.sheet[hoveredField]?.evidence
      if (evidence) return sentenceIndexForRange(sentences, evidence.start, evidence.end)
    }
    return null
  }, [hoveredSentence, hoveredField, analyze.sheet, sentences])

  const activeFieldKeys = useMemo(() => {
    if (hoveredField) return new Set([hoveredField])
    if (hoveredSentence === null) return new Set<string>()
    const keys = new Set<string>()
    for (const [key, entry] of Object.entries(analyze.sheet)) {
      if (entry.evidence && sentenceIndexForRange(sentences, entry.evidence.start, entry.evidence.end) === hoveredSentence) keys.add(key)
    }
    return keys
  }, [hoveredField, hoveredSentence, analyze.sheet, sentences])

  const caught = useMemo(() => colourTriggers(analyze.text, analyze.triggers, analyze.openBundleIds), [analyze.text, analyze.triggers, analyze.openBundleIds])

  const openBundles = orderedOpenBundles(analyze.openBundleIds, bundles)
  const counts = aggregateCounts(openBundles, analyze.sheet)

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onChange?.({ text: analyze.text, sheet: analyze.sheet, counts })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyze.text, analyze.sheet, analyze.openBundleIds])

  const statusText =
    analyze.status === 'error'
      ? (analyze.errorMessage ?? 'Could not analyze')
      : analyze.status === 'pending'
        ? 'Analyzing…'
        : analyze.lastMs != null
          ? `${analyze.lastMs} ms`
          : ''


  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* On a phone the note sits on top and the sheet below it, both in view, so the idea lands without a tap. */}
        <div className="flex min-h-0 flex-none basis-[40%] border-b border-line lg:w-[40%] lg:basis-auto lg:border-b-0 lg:border-e">
          <NotePane
            marks={caught.marks}
            className="h-full w-full"
            text={analyze.text}
            onTextChange={(t) => {
              analyze.setReplaying(false) // a real edit ends any example playback and resumes live analysis
              analyze.setText(t)
            }}
            activeSentence={activeSentenceIndex}
            onHoverSentence={setHoveredSentence}
            readOnly={readOnly}
            dictation={dictation}
            statusText={statusText}
            statusTone={analyze.status === 'error' ? 'error' : 'neutral'}
          />
        </div>
        <div className="flex min-h-0 flex-1">
          <RecordSheet
            caught={caught.byBundle}
            className="h-full w-full"
            mode={mode}
            bundles={bundles}
            sheet={analyze.sheet}
            noteText={analyze.text}
            openBundleIds={analyze.openBundleIds}
            activeFieldKeys={activeFieldKeys}
            onFieldHover={setHoveredField}
            onEdit={analyze.editField}
            onDismiss={analyze.dismissField}
            onRestore={analyze.restoreField}
            readOnly={readOnly}
            pending={analyze.status === 'pending'}
            headerExtra={headerExtra}
          />
        </div>
      </div>
    </div>
  )
})
