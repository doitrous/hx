import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'tinted' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Hover is a material change (background/shadow), never an opacity fade. The
 * primary's shadow is tinted with the action colour rather than black.
 *
 * `tinted` is the "lighter button": DESIGN.md's floor is that `--color-primary`
 * is already the lightest fill that still clears AA with a white label, so a
 * paler-looking primary action is a tinted control (crimson-on-tint), never a
 * lighter fill.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'border border-primary-strong/25 bg-primary text-on-primary shadow-action hover:bg-primary-hover hover:shadow-action-hover',
  tinted:
    'border border-primary-line bg-primary-tint text-primary-strong hover:border-primary/40',
  ghost: 'border border-transparent text-ink-2 hover:border-line hover:bg-inset hover:text-ink',
  danger: 'border border-danger bg-danger text-on-danger shadow-control hover:brightness-[0.94]',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-[13.5px]',
  lg: 'h-11 gap-2 px-5 text-[15px]',
}

const ICON_SIZE: Record<ButtonSize, number> = { sm: 15, md: 16, lg: 18 }

type SharedProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  className?: string
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, SharedProps {
  children?: ReactNode
}

function buttonClasses({ variant = 'tinted', size = 'md', className }: Pick<SharedProps, 'variant' | 'size' | 'className'>) {
  return cn(
    'inline-flex select-none items-center justify-center rounded-lg font-semibold tracking-[-0.005em]',
    'transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-out-quint)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-55',
    VARIANT[variant],
    SIZE[size],
    className,
  )
}

function buttonContent({ loading = false, size = 'md', iconLeft: Left, iconRight: Right, children }: SharedProps & { children?: ReactNode }) {
  return (
    <>
      {loading ? (
        <Loader2 size={ICON_SIZE[size]} strokeWidth={2.15} className="shrink-0 animate-spin" aria-hidden />
      ) : (
        Left && <Left size={ICON_SIZE[size]} strokeWidth={2.15} className="shrink-0" aria-hidden />
      )}
      {children}
      {Right && !loading && <Right size={ICON_SIZE[size]} strokeWidth={2.15} className="shrink-0" aria-hidden />}
    </>
  )
}

export function Button({
  variant = 'tinted',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {buttonContent({ loading, size, iconLeft, iconRight, children })}
    </button>
  )
}

/** A `<Link>` that looks like a `Button` — for navigation, never a form submit. */
export function ButtonLink({ variant = 'tinted', size = 'md', iconLeft, iconRight, loading = false, className, children, ...rest }: LinkProps & SharedProps) {
  return (
    <Link className={buttonClasses({ variant, size, className: cn(loading && 'pointer-events-none opacity-55', className) })} {...rest}>
      {buttonContent({ loading, size, iconLeft, iconRight, children })}
    </Link>
  )
}
