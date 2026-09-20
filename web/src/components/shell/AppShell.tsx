import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { FileText, LayoutDashboard, LibraryBig, LogOut, Menu, Moon, Sun, Users, X } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Popover } from '@/components/ui/Popover'
import { PatientBannerSlot } from './PatientBanner'
import { Logo } from '@/components/ui/Logo'
import { useSession } from '@/lib/session'
import { client } from '@/lib/client'
import { useThemeOverride } from '@/lib/theme'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/patients', label: 'Patients', icon: Users },
  { to: '/app/new', label: 'New note', icon: FileText },
  { to: '/app/library', label: 'Library', icon: LibraryBig },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-inset hover:text-ink',
              isActive && 'nav-selected hover:bg-primary-tint',
            )
          }
        >
          <Icon icon={item.icon} size={16} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useThemeOverride()
  const next = theme === null ? 'light' : theme === 'light' ? 'dark' : null
  const label = theme === null ? 'Theme: system' : theme === 'light' ? 'Theme: light' : 'Theme: dark'
  return (
    <IconButton
      icon={theme === 'dark' ? Moon : Sun}
      label={`${label} — click to change`}
      onClick={() => setTheme(next)}
    />
  )
}

function UserMenu() {
  const { session } = useSession()
  const navigate = useNavigate()
  const name = session.status === 'signed-in' ? session.doctor.name : ''

  async function signOut() {
    await client.auth.logout()
    navigate('/login')
  }

  return (
    <Popover
      align="end"
      trigger={(props) => (
        <button
          {...props}
          className="grid size-9 place-items-center rounded-full border border-line bg-surface-2 text-[12.5px] font-semibold text-ink-2 hover:border-line-2"
        >
          {name ? name.slice(0, 1).toUpperCase() : '?'}
        </button>
      )}
    >
      <div className="px-2.5 py-1.5 text-[12.5px] text-ink-2">{name}</div>
      <button
        onClick={signOut}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[13px] text-ink hover:bg-inset"
      >
        <Icon icon={LogOut} size={14} />
        Sign out
      </button>
    </Popover>
  )
}

/**
 * Left sidebar + topbar shell for everything under /app. The topbar carries a
 * persistent slot for the patient-identity banner (MRN/age/sex) — wrong-
 * patient errors are a safety issue, so it stays visible above every
 * patient-scoped screen regardless of scroll position.
 */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const section = pathname.split('/').slice(0, 3).join('/')

  useEffect(() => setMobileOpen(false), [pathname])

  return (
    <PatientBannerSlot>
      {(banner) => (
        <div className="min-w-0" style={{ minHeight: '100dvh' }}>
          <a
            href="#main-content"
            className="fixed start-3 top-3 z-[70] -translate-y-20 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper transition-transform focus:translate-y-0"
          >
            Skip to content
          </a>

          {/* Desktop sidebar */}
          <aside className="fixed inset-y-0 start-0 z-30 hidden w-(--spacing-sidebar) border-e border-line bg-surface lg:block">
            <div className="flex h-14 items-center border-b border-line px-4">
              <Logo className="h-[20px]" />
            </div>
            <NavList />
          </aside>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button
                type="button"
                aria-label="Close navigation"
                className="animate-fade absolute inset-0 size-full cursor-default bg-ink/30"
                onClick={() => setMobileOpen(false)}
              />
              <div
                className="animate-slide-x absolute inset-y-0 start-0 w-[min(18rem,calc(100vw-3rem))] border-e border-line bg-surface shadow-pop"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
              >
                <div className="flex h-14 items-center justify-between border-b border-line px-4">
                  <Logo className="h-[20px]" />
                  <IconButton icon={X} label="Close navigation" onClick={() => setMobileOpen(false)} />
                </div>
                <NavList onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-col lg:ps-(--spacing-sidebar)" style={{ minHeight: '100dvh' }}>
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm">
              <IconButton icon={Menu} label="Open navigation" className="lg:hidden" onClick={() => setMobileOpen(true)} />
              <div className="min-w-0 flex-1">{banner}</div>
              <ThemeToggle />
              <UserMenu />
            </header>
            <main key={section} id="main-content" tabIndex={-1} className="min-w-0 flex-1 animate-screen-in focus:outline-none">
              <Outlet />
            </main>
          </div>
        </div>
      )}
    </PatientBannerSlot>
  )
}
