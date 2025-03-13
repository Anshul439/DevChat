// components/providers/theme-provider.tsx
'use client'

import { useThemeStore } from '@/store/themeStore'
import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore()

  // Initialize theme from system/localStorage on mount
  useEffect(() => {
    const root = window.document.documentElement
    const initialTheme = root.classList.contains('dark') ? 'dark' : 'light'
    setTheme(initialTheme)
  }, [setTheme])

  // Apply theme changes
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
  }, [theme])

  return <>{children}</>
}