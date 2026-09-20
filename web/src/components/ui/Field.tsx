import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

const base =
  'w-full rounded-md border border-line bg-surface text-[13.5px] text-ink placeholder:text-ink-3 transition-colors focus:border-primary focus:outline-none focus:ring-[var(--ring-field)] disabled:opacity-55'

const errorRing = 'border-danger focus:border-danger focus:ring-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]'

/** Label + control + hint/error. Wrap any input, textarea or select with it. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  const fieldId = htmlFor ?? id
  const hintId = `${fieldId}-hint`
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
        {label}
      </label>
      <div aria-describedby={hint || error ? hintId : undefined}>{children}</div>
      {error ? (
        <p id={hintId} className="mt-1.5 text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(base, 'h-9 px-3', invalid && errorRing, className)} {...props} />
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(base, 'min-h-24 px-3 py-2 leading-relaxed', invalid && errorRing, className)} {...props} />
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select className={cn(base, 'h-9 appearance-none ps-3 pe-9', invalid && errorRing, className)} {...props}>
        {children}
      </select>
      <Icon icon={ChevronDown} size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  )
}
