import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'yonde-admin-theme'

// Admin pages are statically prerendered, so the first client render must
// match that server HTML exactly (theme = 'light') to avoid a hydration
// mismatch; the real preference is applied client-only, right after mount.
export function useAdminTheme() {
  const [theme, setTheme] = useState('light')
  const hydrated = useRef(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const preferred = stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    hydrated.current = true
    setTheme(preferred)
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
