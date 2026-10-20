import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const STORAGE_KEY = 'chotomua-theme'

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to default.
  }
  // Default light: matches the retail-marketplace design system (Stitch redesign,
  // 2026-10) — high deal-visibility light mode, same as Shopee/Tiki. Dark mode
  // stays available via the header toggle for users who prefer it.
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    // data-theme drives theme.css tokens; the `dark` class drives Tailwind's palette + dark: variant.
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore write failures (private mode, storage full, etc.)
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
