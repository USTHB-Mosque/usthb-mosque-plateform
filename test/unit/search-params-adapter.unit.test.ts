import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSearchParamsAdapter } from '@/shared/lib/search-params-adapter'

function stubBrowserWindow(initialSearch = '') {
  const replaceState = vi.fn()
  const pushState = vi.fn()
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()
  vi.stubGlobal('window', {
    location: { pathname: '/library', search: initialSearch },
    history: { replaceState, pushState },
    addEventListener,
    removeEventListener,
  })
  return { replaceState, pushState, addEventListener, removeEventListener }
}

describe('createSearchParamsAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads nothing when window is undefined', () => {
    expect(createSearchParamsAdapter().read()).toEqual({})
  })

  it('writes nothing when window is undefined', () => {
    expect(createSearchParamsAdapter().write({ q: 'x' })).toEqual({})
  })

  it('reads current query params', () => {
    stubBrowserWindow('?q=tafsir&page=2')

    expect(createSearchParamsAdapter().read()).toEqual({ q: 'tafsir', page: '2' })
  })

  it('writes replaced params without a query string when empty', () => {
    const { replaceState } = stubBrowserWindow()

    createSearchParamsAdapter('replace').write({})

    expect(replaceState).toHaveBeenCalledWith({}, '', '/library')
  })

  it('writes replaced params with a query string', () => {
    const { replaceState } = stubBrowserWindow()

    createSearchParamsAdapter('replace').write({ q: 'fiqh' })

    expect(replaceState).toHaveBeenCalledWith({}, '', '/library?q=fiqh')
  })

  it('pushes params in push mode', () => {
    const { pushState, replaceState } = stubBrowserWindow()

    createSearchParamsAdapter('push').write({ q: 'fiqh' })

    expect(pushState).toHaveBeenCalledWith({}, '', '/library?q=fiqh')
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('subscribes to popstate and cleans up', () => {
    const { addEventListener, removeEventListener } = stubBrowserWindow()

    const callback = vi.fn()
    const unsubscribe = createSearchParamsAdapter().subscribe(callback)

    expect(addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
    const handler = addEventListener.mock.calls[0][1] as () => void
    handler()
    expect(callback).toHaveBeenCalledTimes(1)
    unsubscribe()
    expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
  })

  it('returns a no-op unsubscribe when window is undefined', () => {
    const unsubscribe = createSearchParamsAdapter().subscribe(() => {})
    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
  })
})
