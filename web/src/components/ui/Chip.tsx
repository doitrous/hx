import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { systemColor } from '@/lib/systems'
import { cn } from '@/lib/cn'

/** A plain filter/selection chip. Selected state never rides on colour alone — a hairline and text step move with it. */
export function Chip({
  active = false,
  className,
  children,
  ...rest
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[12.5px] font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'border-primary-line bg-primary-tint text-primary-strong'
          : 'border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * A clinical system's identity chip: the categorical colour lives ONLY on a
 * 3px spine (never a fill), with the system's name always printed beside it —
 * colour is a reinforcement, never the sole signal.
 */
export function SystemChip({ system, className }: { system: string; className?: string }) {
  const color = systemColor(system)
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-md border border-line bg-surface ps-2.5 pe-2.5 text-[12px] font-medium text-ink-2',
        className,
      )}
      style={{ boxShadow: `inset 3px 0 0 0 ${color}` }}
    >
      {system}
    </span>
  )
}
