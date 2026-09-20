import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, SquarePlay } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Workspace, type WorkspaceHandle } from '@/components/workspace/Workspace'
import { GitHubStar } from '@/components/landing/GitHubStar'
import { BelowDemo } from '@/components/landing/BelowDemo'
import { useAccounts } from '@/lib/accounts'
import { track } from '@/lib/analytics'
import { Logo } from '@/components/ui/Logo'
import { client } from '@/lib/client'
import { EXAMPLES, type ExampleId } from '@/lib/examples'
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
    setTyping(false)
  }

  function runExample(id: ExampleId = mode, immediate = false) {
    stopTyping()
    track('example_run', { mode: id })
    if (beginTimer.current) clearTimeout(beginTimer.current)
    const modeChanged = id !== mode
    setMode(id)
    const full = EXAMPLES[id].text
    // Clear first — on the same mode this just resets the current instance's
    // sheet via useAnalyze's own empty-text branch; on a mode change it targets
    // the about-to-unmount instance, which is harmless. Either way, filling
    // the real text happens on a short delay so a mode-triggered remount (a
    // new `key`) has time to commit and re-point the ref at the new instance.
    workspaceRef.current?.setText('')
    const begin = () => {
      if (immediate) {
        workspaceRef.current?.setText(full)
        return
      }
      setTyping(true)
      let i = 0
      typeTimer.current = setInterval(() => {
        i += TYPE_CHARS_PER_TICK
        if (i >= full.length) {
          workspaceRef.current?.setText(full)
          stopTyping()
          return
        }
        workspaceRef.current?.setText(full.slice(0, i))
      }, TYPE_TICK_MS)
    }
    beginTimer.current = setTimeout(begin, modeChanged ? 60 : 0)
  }

  useEffect(() => {
    if (!bundles || startedFromQuery.current || !params.get('example')) return
    startedFromQuery.current = true
    runExample(mode, instant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundles])

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-[1680px] items-center justify-between px-4 py-4 sm:px-8">
        <Logo className="h-[24px]" />
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
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <Tabs
                items={[
                  { value: 'clinical', label: 'Clinical' },
                  { value: 'operative', label: 'Operative' },
                ]}
                value={mode}
                onChange={(v) => runExample(v as ExampleId, false)}
              />
              <Button
                size="sm"
                variant="tinted"
                iconLeft={typing ? SquarePlay : Sparkles}
                onClick={() => (typing ? runExample(mode, true) : runExample(mode, false))}
              >
                {typing ? 'Skip' : 'Try an example'}
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1680px] px-4 sm:px-8">
          <p className="mb-2 text-[12.5px] font-medium text-ink-2">
            <span aria-hidden className="me-2 inline-block size-1.5 rounded-full bg-primary align-middle" />
            Demo. Nothing is saved. Do not enter real patient details.
          </p>

          <div className="flex h-[calc(100dvh-5rem)] max-h-[940px] min-h-[620px] flex-col overflow-hidden rounded-xl border border-line shadow-panel">
            {loadError ? (
              <div className="grid h-full place-items-center px-6 text-center text-[13.5px] text-ink-2">
                The demo could not load its bundle catalogue right now — try again shortly.
              </div>
            ) : bundles ? (
              <Workspace key={mode} ref={workspaceRef} mode={mode} bundles={bundles.bundles} demo />
            ) : (
              <div className="flex h-full flex-col gap-3 p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </div>
        </section>

        <div className="mt-16">
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
