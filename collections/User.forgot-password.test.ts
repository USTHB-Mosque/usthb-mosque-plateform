import { describe, expect, it, vi, afterEach } from 'vitest'

import { User } from './User'

const generateEmailHTML = User.auth?.forgotPassword?.generateEmailHTML
const generateEmailSubject = User.auth?.forgotPassword?.generateEmailSubject

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

  it('falls back to an empty server URL when the env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', '')

    const html = generateEmailHTML?.({ token: 'token-123' } as never)

    expect(html).toContain('/auth/reset/token-123')
  })

  it('tolerates missing args and missing tokens', () => {
    expect(generateEmailHTML?.(undefined as never)).toBeTruthy()
    expect(generateEmailHTML?.({} as never)).toBeTruthy()
  })

  it('uses an Arabic subject line', () => {
    expect(generateEmailSubject?.({} as never)).toBe('إعادة تعيين كلمة المرور')
  })
})
