import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Serif page title above sans supporting copy — the primary hierarchy signal per DESIGN.md. */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-[22px] font-semibold text-ink sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13.5px] text-ink-2">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
