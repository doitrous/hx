import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

/** Per DESIGN.md's guardrail: the glyph sits in a small hairline tile above a serif title — never a big centred icon as decoration. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-3 grid size-11 place-items-center rounded-xl border border-line bg-surface-2 text-ink-3">
          <Icon icon={icon} size={20} />
        </div>
      )}
      <h3 className="font-serif text-[17px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
