import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

const SIZE = { sm: 'size-8', md: 'size-9', lg: 'size-11' }
const GLYPH = { sm: 14, md: 16, lg: 18 }

export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  className,
  ...rest
}: {
  icon: LucideIcon
  /** Required — an icon-only control needs a name for assistive tech. */
  label: string
  size?: keyof typeof SIZE
  variant?: 'ghost' | 'tinted'
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-lg border border-transparent text-ink-2 transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:pointer-events-none disabled:opacity-55',
        variant === 'ghost' && 'hover:border-line hover:bg-inset hover:text-ink',
        variant === 'tinted' && 'border-primary-line bg-primary-tint text-primary-strong hover:border-primary/40',
        SIZE[size],
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={GLYPH[size]} />
    </button>
  )
}
