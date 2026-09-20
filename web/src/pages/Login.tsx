import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/shell/AuthLayout'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { client } from '@/lib/client'
import { ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useSession()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await client.auth.login({ email, password })
      await refresh()
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/app'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in" description="A doctor's own patients, by MRN.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={error ?? undefined}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Sign in
        </Button>
        <p className="text-center text-[13px] text-ink-2">
          No account?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
