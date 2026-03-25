import { SearchStorageAdapter } from '@/interfaces/search.d'

export const createSearchParamsAdapter = (
  mode: 'replace' | 'push' = 'replace',
): SearchStorageAdapter => ({
  read() {
    const params = new URLSearchParams(window.location.search)

    const result: Record<string, string> = {}

    params.forEach((value, key) => {
      result[key] = value
    })

    return result
  },

  write(values) {
    const params = new URLSearchParams(values)

    const url = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')

    if (mode === 'replace') {
      window.history.replaceState({}, '', url)
    } else {
      window.history.pushState({}, '', url)
    }
  },

  subscribe(callback) {
    const handler = () => callback()

    window.addEventListener('popstate', handler)

    return () => window.removeEventListener('popstate', handler)
  },
})
