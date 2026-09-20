import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'

const TONE: Record<Tone, string> = {
  neutral: 'bg-inset text-ink-2',
  primary: 'bg-primary-tint text-primary-strong border-primary-line',
  accent: 'bg-accent-tint text-accent-strong border-accent-line',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
}

const DOT: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-[11.5px] font-medium leading-5 whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOT[tone])} aria-hidden />}
      {children}
    </span>
  )
}

/**
 * Dot + word, always — the state families this app cares about (field state,
 * encounter status) are never told apart by colour alone.
 */
const STATUS_TONE: Record<string, Tone> = {
  filled: 'success',
  unclear: 'warning',
  empty: 'neutral',
  dismissed: 'neutral',
  draft: 'warning',
  final: 'success',
}

const STATUS_LABEL: Record<string, string> = {
  filled: 'Filled',
  unclear: 'Unclear',
  empty: 'Empty',
  dismissed: 'Dismissed',
  draft: 'Draft',
  final: 'Final',
}

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot className={className}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
