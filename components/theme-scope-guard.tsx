'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

const isPortalPath = (path: string) =>
  path === '/user' ||
  path.startsWith('/user/') ||
  path === '/member-portal' ||
  path.startsWith('/member-portal/')

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')

const applyThemeClasses = (wantDark: boolean) => {
  const el = document.documentElement
  el.classList.remove('light', 'dark')
  el.classList.add(wantDark ? 'dark' : 'light')
  el.style.colorScheme = wantDark ? 'dark' : 'light'
}

const ThemeScopeGuard: React.FC = () => {
  const pathname = usePathname()
  const { theme } = useTheme()

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    // Visitors pages have no dark mode: always enforce light.
    const visitor = !isPortalPath(pathname) && !isAdminPath(pathname)

    const sync = () => {
      const wantDark =
        !visitor && (theme === 'dark' || (theme === 'system' && mql.matches))
      applyThemeClasses(wantDark)
    }

    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [pathname, theme])

  return null
}

export default ThemeScopeGuard