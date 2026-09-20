import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { client } from './client'
import { ApiError } from './api'
import type { Doctor } from './types'

type SessionState =
  | { status: 'loading' }
  | { status: 'signed-in'; doctor: Doctor }
  | { status: 'signed-out' }

const SessionContext = createContext<{
  session: SessionState
  refresh: () => Promise<void>
}>({ session: { status: 'loading' }, refresh: async () => {} })

/** Loads GET /api/me once on mount. Wrap the whole app so any page can read it. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' })

  async function refresh() {
    try {
      const doctor = await client.me()
      setSession({ status: 'signed-in', doctor })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setSession({ status: 'signed-out' })
      else setSession({ status: 'signed-out' })
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <SessionContext.Provider value={{ session, refresh }}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}

/** Session guard for everything under /app — the pattern later agents route their screens through. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const location = useLocation()

  if (session.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center text-[13.5px] text-ink-2">
        Loading&hellip;
      </div>
    )
  }
  if (session.status === 'signed-out') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}
