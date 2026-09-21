import { afterEach, describe, expect, it, vi } from 'vitest'

import { redirectToLogin, safeRedirect } from '@/shared/lib/redirect'

describe('safeRedirect', () => {
  it('keeps a plain relative path', () => {
    expect(safeRedirect('/user/dashboard', '/')).toBe('/user/dashboard')
  })

  it('falls back for null, undefined and empty values', () => {
    expect(safeRedirect(null, '/auth/login')).toBe('/auth/login')
    expect(safeRedirect(undefined, '/auth/login')).toBe('/auth/login')
    expect(safeRedirect('', '/auth/login')).toBe('/auth/login')
  })

  it('falls back for protocol-relative URLs', () => {
    expect(safeRedirect('//evil.example', '/')).toBe('/')
  })

  it('falls back for absolute URLs', () => {
    expect(safeRedirect('https://evil.example', '/')).toBe('/')
    expect(safeRedirect('http://evil.example', '/')).toBe('/')
  })

  it('falls back for values that do not start with a slash', () => {
    expect(safeRedirect('user/dashboard', '/')).toBe('/')
  })
})

describe('redirectToLogin', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects a page outside /auth with the current path encoded', () => {
    const replace = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/user/dashboard', replace },
    })

    redirectToLogin()

    expect(replace).toHaveBeenCalledWith(
      '/auth/login?redirect=%2Fuser%2Fdashboard',
    )
  })

  it('does nothing when already inside /auth', () => {
    const replace = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/auth/login', replace },
    })

    redirectToLogin()

    expect(replace).not.toHaveBeenCalled()
  })
})
