import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { pageView } from '@/lib/analytics'
import { AppShell } from '@/components/shell/AppShell'
import { RequireSession } from '@/lib/session'
import { useAccounts } from '@/lib/accounts'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Dashboard } from '@/pages/Dashboard'
import { Patients } from '@/pages/Patients'
import { PatientDetail } from '@/pages/PatientDetail'
import { EncounterWorkspace } from '@/pages/EncounterWorkspace'
import { Library } from '@/pages/Library'
import { NewNote } from '@/pages/NewNote'
import { Styleguide } from '@/pages/Styleguide'
import { NotFound } from '@/pages/NotFound'

export function App() {
  const accounts = useAccounts()
  const { pathname } = useLocation()
  useEffect(() => pageView(), [pathname])
  // Until the server says whether accounts exist, a product URL renders nothing rather than flashing "not found".
  if (accounts === null && location.pathname !== '/') return null
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/styleguide" element={<Styleguide />} />

      {accounts && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/app"
            element={
              <RequireSession>
                <AppShell />
              </RequireSession>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="encounters/:id" element={<EncounterWorkspace />} />
            <Route path="library" element={<Library />} />
            <Route path="new" element={<NewNote />} />
          </Route>
        </>
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
