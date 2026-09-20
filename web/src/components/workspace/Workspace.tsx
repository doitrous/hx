import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { RecordSheet } from '@/components/sheet/RecordSheet'
import { aggregateCounts, orderedOpenBundles } from '@/components/sheet/bundleTree'
import { cn } from '@/lib/cn'
import { useAnalyze } from '@/lib/useAnalyze'
import { useDictation } from '@/lib/useDictation'
import type { Bundle, Sheet } from '@/lib/types'
import { NotePane } from './NotePane'
import { sentenceIndexForRange, splitSentences } from './sentences'

export type WorkspaceHandle = {
  /** Drives text in imperatively — used by the demo landing's "type an example" control. */
  setText: (text: string) => void
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
  onChange?: (state: { text: string; sheet: Sheet }) => void
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
    analyze.setText(analyze.text.length && !/\s$/.test(analyze.text) ? `${analyze.text} ${chunk}` : `${analyze.text}${chunk}`)
  })

  useImperativeHandle(ref, () => ({ setText: analyze.setText }), [analyze.setText])

  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [hoveredSentence, setHoveredSentence] = useState<number | null>(null)
  const [mobileView, setMobileView] = useState<'note' | 'sheet'>('note')

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

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onChange?.({ text: analyze.text, sheet: analyze.sheet })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyze.text, analyze.sheet])

  const statusText =
    analyze.status === 'error'
      ? (analyze.errorMessage ?? 'Could not analyze')
      : analyze.status === 'pending'
        ? 'Analyzing…'
        : analyze.lastMs != null
          ? `${analyze.lastMs} ms`
          : ''

  const openBundles = orderedOpenBundles(analyze.openBundleIds, bundles)
  const counts = aggregateCounts(openBundles, analyze.sheet)

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="lg:hidden">
        <Tabs
          items={[
            { value: 'note', label: 'Note' },
            { value: 'sheet', label: 'Sheet', count: counts.filled },
          ]}
          value={mobileView}
          onChange={(v) => setMobileView(v as 'note' | 'sheet')}
          className="px-4"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Each pane's own root always declares `flex`; the show/hide toggle
            lives on this wrapper instead, so a "hidden" from here never has
            to out-rank a "flex" declared inside the same class list. */}
        <div className={cn(mobileView === 'note' ? 'flex' : 'hidden', 'min-h-0 flex-1 lg:flex lg:w-[40%] lg:flex-none lg:border-e lg:border-line')}>
          <NotePane
            className="h-full w-full"
            text={analyze.text}
            onTextChange={analyze.setText}
            activeSentence={activeSentenceIndex}
            onHoverSentence={setHoveredSentence}
            readOnly={readOnly}
            dictation={dictation}
            statusText={statusText}
            statusTone={analyze.status === 'error' ? 'error' : 'neutral'}
          />
        </div>
        <div className={cn(mobileView === 'sheet' ? 'flex' : 'hidden', 'min-h-0 flex-1 lg:flex')}>
          <RecordSheet
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
