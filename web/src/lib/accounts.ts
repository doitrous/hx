import { useEffect, useState } from 'react'
import { USING_MOCK } from './client'
import { startAnalytics } from './analytics'

let cached: boolean | null = USING_MOCK ? true : null
let inflight: Promise<boolean> | null = null

/**
 * Whether this deployment has accounts and patient records switched on
 * (server env ACCOUNTS_ENABLED). `null` while unknown. A demo-only deploy
 * answers false, and the login and product routes are then never mounted.
 */
export function useAccounts(): boolean | null {
  const [value, setValue] = useState(cached)
  useEffect(() => {
    if (cached !== null) return
    inflight ??= fetch('/api/config')
      .then((r) => r.json())
      .then((c: { accounts?: boolean; gaId?: string }) => {
        startAnalytics(c.gaId)
        return (cached = c.accounts === true)
      })
      .catch(() => (cached = false))
    void inflight.then(setValue)
  }, [])
  return value
}
