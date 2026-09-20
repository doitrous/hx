import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'

/**
 * The "clinical intake sheet" composition: quiet ruled header, serif page
 * title, a bordered surface sheet holding the task, and a persistent trust
 * statement below it — no wordmark, no mark, just the plain text lockup.
 *
 * `aside` is the wide variant's ownership ledger (signup); omit it for the
 * compact single-column variant (login, password reset, etc).
 */
export function AuthLayout({
  title,
  description,
  aside,
  children,
}: {
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid-chart min-h-dvh bg-paper">
      <header className="border-b border-line px-4 py-4 sm:px-8">
        <Link to="/" className="inline-flex">
          <Logo className="h-[24px]" />
        </Link>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col items-stretch px-4 py-10 sm:px-8 sm:py-16">
        <div className={cn('mx-auto w-full', aside ? 'max-w-5xl' : 'max-w-md')}>
          <div className="mb-6 text-center">
            <h1 className="font-serif text-[24px] font-semibold text-ink sm:text-[28px]">{title}</h1>
            {description && <p className="mt-2 text-[13.5px] text-ink-2">{description}</p>}
          </div>

          <div className={cn('grid gap-6', aside ? 'lg:grid-cols-[1fr_minmax(0,260px)]' : null)}>
            <div className="rounded-xl border border-line bg-surface p-6 shadow-panel sm:p-8">{children}</div>
            {aside && (
              <div className="rounded-xl border border-line bg-surface-2 p-5 text-[12.5px] text-ink-2">{aside}</div>
            )}
          </div>

          <p className="mt-6 text-center text-[12px] text-ink-3">
            Patient names and MRNs are never sent to the analysis model — only the note text, with names scrubbed first.
          </p>
        </div>
      </main>
    </div>
  )
}
