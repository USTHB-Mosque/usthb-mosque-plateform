'use client'

import React, { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

const isPortalPath = (path: string) =>
  path === '/user' ||
  path.startsWith('/user/') ||
  path === '/member-portal' ||
  path.startsWith('/member-portal/')

const isAdminPath = (path: string) =>
  path === '/admin' ||
  path.startsWith('/admin/') ||
  path === '/admin-panel' ||
  path.startsWith('/admin-panel/')

const applyThemeClasses = (wantDark: boolean) => {
  const el = document.documentElement
  el.classList.remove('light', 'dark')
  el.classList.add(wantDark ? 'dark' : 'light')
  el.style.colorScheme = wantDark ? 'dark' : 'light'
}

const ThemeScopeGuard: React.FC = () => {
  const pathname = usePathname()
  const { theme, resolvedTheme } = useTheme()

  // next-themes applies `dark` on hydration from the system preference with an
  // effect that runs after this one and is not path-aware, so a one-shot
  // application here is not enough. Force light before paint and then watch the
  // `<html>` class attribute, reverting any `dark` a visitor page must never wear.
  useLayoutEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const html = document.documentElement
    // Visitors pages have no dark mode: always enforce light.
    const visitor = !isPortalPath(pathname) && !isAdminPath(pathname)

    const sync = () => {
      const wantDark =
        !visitor && (theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark'))
      applyThemeClasses(wantDark)
    }

    sync()
    mql.addEventListener('change', sync)

    const observer = visitor ? new MutationObserver(sync) : null
    observer?.observe(html, { attributes: true, attributeFilter: ['class'] })

    return () => {
      mql.removeEventListener('change', sync)
      observer?.disconnect()
    }
  }, [pathname, theme, resolvedTheme])

  return null
}

export default ThemeScopeGuard
