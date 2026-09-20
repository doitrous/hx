import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { AuthLayout } from '@/components/shell/AuthLayout'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/cn'

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'A letter and a number', test: (v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v) },
]

/** Neutral circle until met, a check only after — password rules never rely on colour alone. */
function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li key={rule.label} className={cn('flex items-center gap-1.5 text-[12px]', met ? 'text-ink' : 'text-ink-3')}>
            <Icon icon={met ? Check : Circle} size={13} className={met ? 'text-success' : 'text-ink-3'} />
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}

export function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useSession()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await client.auth.signup({ email, password, name })
      await refresh()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      description="One account, your own patients."
      aside={
        <div>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">What this account holds</h2>
          <ul className="flex flex-col gap-2">
            <li>Your patients, identified by MRN.</li>
            <li>Their notes and structured records.</li>
            <li>Nothing is shared across doctors.</li>
          </ul>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={error ?? undefined}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordRules password={password} />
        </Field>
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Create account
        </Button>
        <p className="text-center text-[13px] text-ink-2">
          Already have one?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
