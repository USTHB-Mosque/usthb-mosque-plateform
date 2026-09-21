import { afterEach, describe, expect, it, vi } from 'vitest'

process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'

import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  GOOGLE_OAUTH_STATE_COOKIE,
  isGoogleOAuthConfigured,
} from '@/features/auth/server/oauth-google'

describe('isGoogleOAuthConfigured', () => {
  const originalId = process.env.GOOGLE_CLIENT_ID
  const originalSecret = process.env.GOOGLE_CLIENT_SECRET

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalId
    process.env.GOOGLE_CLIENT_SECRET = originalSecret
  })

  it('is false without credentials', () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(isGoogleOAuthConfigured()).toBe(false)
  })

  it('is false with only the client id', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(isGoogleOAuthConfigured()).toBe(false)
  })

  it('is true with both credentials', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    expect(isGoogleOAuthConfigured()).toBe(true)
  })
})

describe('buildGoogleAuthorizationUrl', () => {
  const originalId = process.env.GOOGLE_CLIENT_ID
  const originalSecret = process.env.GOOGLE_CLIENT_SECRET

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalId
    process.env.GOOGLE_CLIENT_SECRET = originalSecret
  })

  it('points at the Google endpoint with the callback redirect URI and state', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'

    const url = new URL(buildGoogleAuthorizationUrl('state-123'))

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/oauth/google/callback',
    )
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('access_type')).toBe('online')
    expect(url.searchParams.get('prompt')).toBe('select_account')
    expect(url.searchParams.get('state')).toBe('state-123')
  })
})

describe('buildGoogleAuthorizationUrl fallbacks', () => {
  const originalId = process.env.GOOGLE_CLIENT_ID
  const originalSecret = process.env.GOOGLE_CLIENT_SECRET
  const originalServerUrl = process.env.NEXT_PUBLIC_SERVER_URL

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalId
    process.env.GOOGLE_CLIENT_SECRET = originalSecret
    process.env.NEXT_PUBLIC_SERVER_URL = originalServerUrl
  })

  it('falls back to the localhost redirect URI when NEXT_PUBLIC_SERVER_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SERVER_URL
    process.env.GOOGLE_CLIENT_ID = 'client-id'

    const url = new URL(buildGoogleAuthorizationUrl('s'))
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/oauth/google/callback',
    )
  })

  it('falls back to an empty client id when unset', () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.NEXT_PUBLIC_SERVER_URL

    const url = new URL(buildGoogleAuthorizationUrl('s'))
    expect(url.searchParams.get('client_id')).toBe('')
  })
})

describe('GOOGLE_OAUTH_STATE_COOKIE', () => {
  it('has a stable name', () => {
    expect(GOOGLE_OAUTH_STATE_COOKIE).toBe('google-oauth-state')
  })
})

describe('exchangeGoogleCode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when the token exchange fails', async () => {
    const originalId = process.env.GOOGLE_CLIENT_ID
    const originalSecret = process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: false, status: 400 })),
      )

      expect(await exchangeGoogleCode('bad-code')).toBeNull()
    } finally {
      process.env.GOOGLE_CLIENT_ID = originalId
      process.env.GOOGLE_CLIENT_SECRET = originalSecret
    }
  })

  it('returns null when the token response has no access_token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
      ),
    )

    expect(await exchangeGoogleCode('code')).toBeNull()
  })

  it('returns null when the userinfo call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('token')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ access_token: 'at' }),
          })
        }
        return Promise.resolve({ ok: false, status: 401 })
      }),
    )

    expect(await exchangeGoogleCode('code')).toBeNull()
  })

  it('returns null when the identity has no email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('token')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ access_token: 'at' }),
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ email_verified: true }),
        })
      }),
    )

    expect(await exchangeGoogleCode('code')).toBeNull()
  })

  it('returns the verified identity on success', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('token')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'at' }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ email: 'a@b.dz', email_verified: true, name: 'A' }),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const identity = await exchangeGoogleCode('code')

    expect(identity).toEqual({ email: 'a@b.dz', emailVerified: true, name: 'A' })
    const [, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(tokenInit?.body)).toContain('grant_type=authorization_code')
    const [infoUrl, infoInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(infoUrl).toBe('https://www.googleapis.com/oauth2/v3/userinfo')
    expect((infoInit?.headers as Record<string, string>).Authorization).toBe('Bearer at')
  })
})
