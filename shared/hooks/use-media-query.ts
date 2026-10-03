import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks a CSS media query.
 *
 * SSR-safe: the server snapshot falls back to `defaultValue`, so hydration
 * never mismatches, and React re-reads the live value right after hydrating
 * (before paint, so there is no flash). In jsdom the matchMedia stub never
 * matches, which makes components fall back to their below-breakpoint state
 * in tests.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {}
      }
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return defaultValue
    }
    return window.matchMedia(query).matches
  }, [query, defaultValue])

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
