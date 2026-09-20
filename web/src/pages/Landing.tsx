import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pause, Play, SkipForward, Sparkles } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Workspace, type WorkspaceHandle } from '@/components/workspace/Workspace'
import { GitHubStar } from '@/components/landing/GitHubStar'
import { Charts, type TracePoint } from '@/components/landing/Charts'
import { BelowDemo } from '@/components/landing/BelowDemo'
import { useAccounts } from '@/lib/accounts'
import { track } from '@/lib/analytics'
import { Logo } from '@/components/ui/Logo'
import { client } from '@/lib/client'
import { EXAMPLES, type ExampleId } from '@/lib/examples'
import FRAMES from '@/lib/example-frames.json'
import type { AnalyzeResponse } from '@/lib/types'

type Frame = { at: number; res: Pick<AnalyzeResponse, 'bundles' | 'fields'> }
import type { Bundles } from '@/lib/types'

const TYPE_CHARS_PER_TICK = 6
const TYPE_TICK_MS = 26

/**
 * The public demo. No login, nothing stored — every call goes through
 * client.demoAnalyze. Deliberately not a gradient hero or a three-card
 * feature grid (see web/README.md's anti-slop guardrails): a headline, one
 * sentence, the real workspace, and an editorial explanation with ruled
 * dividers.
 */
export function Landing() {
  const [params] = useSearchParams()
  const accounts = useAccounts()
  const [bundles, setBundles] = useState<Bundles | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [mode, setMode] = useState<ExampleId>(params.get('example') === 'operative' ? 'operative' : 'clinical')
  const [typing, setTyping] = useState(false)
  const [paused, setPaused] = useState(false)
  const [trace, setTrace] = useState<TracePoint[]>([])
  const pausedRef = useRef(false)
  const workspaceRef = useRef<WorkspaceHandle>(null)
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const beginTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const instant = params.get('instant') === '1'
  const startedFromQuery = useRef(false)

  useEffect(() => {
    client
      .bundles()
      .then(setBundles)
      .catch(() => setLoadError(true))
  }, [])

  useEffect(
    () => () => {
      stopTyping()
      if (beginTimer.current) clearTimeout(beginTimer.current)
    },
    [],
  )

  function stopTyping() {
    if (typeTimer.current) clearInterval(typeTimer.current)
    typeTimer.current = null
    pausedRef.current = false
    setPaused(false)
    setTyping(false)
  }

  /**
   * Plays a recorded example. The text types itself in and the sheet fills
   * from responses captured once by scripts/record-examples.mjs, so a visitor
   * pressing this button costs nothing. Live analysis resumes the moment they
   * edit the note themselves.
   */
  function runExample(id: ExampleId = mode, immediate = false, auto = false) {
    stopTyping()
    setTrace([])
    if (!auto) track('example_run', { mode: id })
    if (beginTimer.current) clearTimeout(beginTimer.current)
    const modeChanged = id !== mode
    setMode(id)
    const full = EXAMPLES[id].text
    const frames = (FRAMES as unknown as Record<ExampleId, Frame[]>)[id] ?? []
    workspaceRef.current?.setReplaying(true)
    workspaceRef.current?.setText('')
    const begin = () => {
      const ws = () => workspaceRef.current
      ws()?.setReplaying(true)
      let applied = 0
      const show = (upTo: number) => {
        ws()?.setText(full.slice(0, upTo))
        while (applied < frames.length && frames[applied].at <= upTo) ws()?.applyResponse(frames[applied++].res, full)
      }
      const finish = () => {
        show(full.length)
        stopTyping()
        // The replay gate stays shut here. Workspace opens it when the visitor edits the note.
      }
      if (immediate) return finish()
      setTyping(true)
      let i = 0
      typeTimer.current = setInterval(() => {
        if (pausedRef.current) return
        i += TYPE_CHARS_PER_TICK
        if (i >= full.length) return finish()
        show(i)
      }, TYPE_TICK_MS)
    }
    // A mode change remounts the workspace (new `key`); wait for the ref to point at the new one.
    beginTimer.current = setTimeout(begin, modeChanged ? 60 : 0)
  }

  function togglePause() {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
  }

  // The example is a recording, so playing it for every visitor costs nothing.
  useEffect(() => {
    if (!bundles || startedFromQuery.current) return
    startedFromQuery.current = true
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    runExample(mode, instant || still, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundles])

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-[1680px] items-center justify-between px-4 py-4 sm:px-8">
        <Logo className="h-[30px]" />
        <GitHubStar />
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1680px] px-4 pt-6 pb-5 sm:px-8 lg:pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0">
              <h1 className="font-serif text-[30px] font-semibold leading-[1.12] text-ink sm:text-[38px]">
                The record fills itself in while you write.
              </h1>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1680px] px-4 sm:px-8">
          <div className="flex h-[calc(100dvh-5rem)] max-h-[940px] min-h-[620px] flex-col overflow-hidden rounded-xl border border-line shadow-panel">
            {/* The controls live on the thing they control. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-3 py-1.5 sm:px-4">
              <Tabs
                items={[
                  { value: 'clinical', label: 'Clinical' },
                  { value: 'operative', label: 'Operative' },
                ]}
                value={mode}
                onChange={(v) => {
                  stopTyping()
                                setMode(v as ExampleId)
                }}
              />
              <p className="order-last w-full text-[12px] text-ink-2 sm:order-none sm:w-auto">
                <span aria-hidden className="me-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
                Demo. Nothing is saved. Do not enter real patient details.
              </p>
              <div className="ms-auto flex items-center gap-2">
              {typing && (
                <Button size="sm" variant="ghost" iconLeft={paused ? Play : Pause} onClick={togglePause}>
                  {paused ? 'Resume' : 'Pause'}
                </Button>
              )}
              <Button
                size="sm"
                variant="tinted"
                iconLeft={typing ? SkipForward : Sparkles}
                onClick={() => (typing ? runExample(mode, true) : runExample(mode, false))}
              >
                {typing ? 'Skip to end' : 'Try an example'}
              </Button>
              </div>
            </div>
            {loadError ? (
              <div className="grid h-full place-items-center px-6 text-center text-[13.5px] text-ink-2">
                The demo could not load its bundle catalogue right now — try again shortly.
              </div>
            ) : bundles ? (
              <Workspace key={mode} ref={workspaceRef} mode={mode} bundles={bundles.bundles} demo
                className="min-h-0 flex-1"
                onChange={({ text, counts }) => {
                  if (!text.trim()) return setTrace([])
                  const point = { answered: counts.filled, owed: counts.empty + counts.unclear }
                  setTrace((prev) => {
                    const last = prev[prev.length - 1]
                    if (last && last.answered === point.answered && last.owed === point.owed) return prev
                    return [...prev.slice(-199), point]
                  })
                }}
              />
            ) : (
              <div className="flex h-full flex-col gap-3 p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </div>
        </section>

        <Charts bundles={bundles?.bundles ?? null} trace={trace} />

        <div className="mt-12">
          <BelowDemo bundles={bundles?.bundles ?? null} accounts={accounts === true} />
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-6 sm:px-8">
        <p className="text-[12px] text-ink-3">Patient names and MRNs are never sent to the analysis model. The demo stores nothing.</p>
        {accounts ? (
          <Link to="/login" className="text-[13px] font-semibold text-ink-2 hover:text-ink">
            Sign in
          </Link>
        ) : (
          <span className="text-[12px] text-ink-3">Accounts are coming soon.</span>
        )}
      </footer>
    </div>
  )
}
