import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface px-1',
        'font-mono text-[11px] leading-none text-ink-2 shadow-[0_1px_0_var(--color-line-2)]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
