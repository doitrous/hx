import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/** One stroke weight across the app. Icons are decorative — labels carry meaning. */
export function Icon({
  icon: Glyph,
  size = 16,
  strokeWidth = 1.95,
  className,
  open,
}: {
  icon: LucideIcon
  size?: number
  strokeWidth?: number
  className?: string
  /** Disclosure state, published as `data-open` for the `chevron-turn` utility. */
  open?: boolean
}) {
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      data-open={open === undefined ? undefined : String(open)}
      aria-hidden="true"
    />
  )
}
