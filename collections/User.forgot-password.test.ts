import { describe, expect, it, vi, afterEach } from 'vitest'
import type { IncomingAuthType } from 'payload'

import { User } from './User'

// `auth` is typed `boolean | IncomingAuthType`; the collection enables it.
const auth = User.auth as IncomingAuthType | undefined
const generateEmailHTML = auth?.forgotPassword?.generateEmailHTML
const generateEmailSubject = auth?.forgotPassword?.generateEmailSubject

describe('collections/User.ts forgot-password email overrides', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('links the public reset page with the server URL and token', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://mosque.example')

    const html = generateEmailHTML?.({ token: 'token-123' } as never)

    expect(html).toContain('https://mosque.example/auth/reset/token-123')
    expect(html).toContain('dir="rtl"')
  })

  it('derives the origin from request headers when no server URL is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '')
    const req = {
      headers: new Headers({
        'x-forwarded-host': 'preview-abc.vercel.app',
        'x-forwarded-proto': 'https',
      }),
    }

    const html = generateEmailHTML?.({ req, token: 'token-123' } as never)

    expect(html).toContain('https://preview-abc.vercel.app/auth/reset/token-123')
  })

  it('falls back to the host header with a https default', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '')
    const req = { headers: new Headers({ host: 'mosque-preview.vercel.app' }) }

    const html = generateEmailHTML?.({ req, token: 'token-123' } as never)

    expect(html).toContain('https://mosque-preview.vercel.app/auth/reset/token-123')
  })

  it('falls back to a relative link when neither env nor request provide an origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '')

    const html = generateEmailHTML?.({ token: 'token-123' } as never)

    expect(html).toContain('/auth/reset/token-123')
    expect(html).not.toContain('http:///auth')
  })

  it('tolerates missing args and missing tokens', () => {
    expect(generateEmailHTML?.(undefined as never)).toBeTruthy()
    expect(generateEmailHTML?.({} as never)).toBeTruthy()
  })

  it('uses an Arabic subject line', () => {
    expect(generateEmailSubject?.({} as never)).toBe('إعادة تعيين كلمة المرور')
  })
})
