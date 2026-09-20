import { useEffect, useState } from 'react'

const KEY = 'clinical-notes-theme'
export type ThemeOverride = 'light' | 'dark' | null

function apply(theme: ThemeOverride) {
  if (theme) document.documentElement.setAttribute('data-theme', theme)
  else document.documentElement.removeAttribute('data-theme')
}

function read(): ThemeOverride {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : null
}

/** The explicit theme override (see the boot script in index.html), defaulting to the OS preference. */
export function useThemeOverride(): [ThemeOverride, (t: ThemeOverride) => void] {
  const [theme, setThemeState] = useState<ThemeOverride>(() => (typeof window === 'undefined' ? null : read()))

  useEffect(() => apply(theme), [theme])

  function setTheme(t: ThemeOverride) {
    setThemeState(t)
    if (t) localStorage.setItem(KEY, t)
    else localStorage.removeItem(KEY)
  }

  return [theme, setTheme]
}
