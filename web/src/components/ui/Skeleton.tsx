import { cn } from '@/lib/cn'

/**
 * Base skeleton block.
 * ponytail: no per-component `motion-reduce:` class — index.css already has a
 * blanket `prefers-reduced-motion` rule that collapses animation durations,
 * so `animate-pulse` already stops pulsing for those users.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-inset', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonRow({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-full', className)} />
}
