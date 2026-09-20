import type { ComponentPropsWithRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

/** A clinical-chart surface: white field, hairline rule, quiet elevation. */
export function Panel({ className, children, ...rest }: ComponentPropsWithRef<'div'>) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-line bg-surface shadow-panel', className)} {...rest}>
      {children}
    </div>
  )
}

/** Chart-field header: a small sans-serif label per DESIGN.md ("panel titles are sans, 13.5px bold"). */
export function PanelHeader({
  title,
  hint,
  icon,
  action,
  className,
}: {
  title: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon && <Icon icon={icon} size={16} strokeWidth={2.15} className="text-ink-3" />}
        <h3 className="truncate font-sans text-[13.5px] font-bold tracking-[-0.012em] text-ink">{title}</h3>
        {hint && <span className="truncate text-[12px] text-ink-3">{hint}</span>}
      </div>
      {action && <div className="flex min-w-0 max-w-full shrink-0 items-center gap-1">{action}</div>}
    </div>
  )
}
