import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const fakePayload = {
  forgotPassword: vi.fn(),
}

const getPayload = vi.fn(async (..._args: unknown[]) => fakePayload)
const nextHeaders = vi.fn()

vi.mock('payload', () => ({
  getPayload: (...args: unknown[]) => getPayload(...args),
}))

vi.mock('@/payload.config', () => ({ default: {} }))

vi.mock('next/headers', () => ({
  headers: (...args: unknown[]) => nextHeaders(...args),
}))

const { requestPasswordReset } = await import('./forgot-password')
const { resetRateLimits } = await import('@/shared/lib/rate-limit')
const { FORGOT_PASSWORD_LIMIT } = await import('@/features/auth/password-reset-constants')

describe('features/auth/server/forgot-password.ts', () => {
  beforeEach(() => {
    fakePayload.forgotPassword.mockReset()
    // mockReset, not mockClear: the "payload init fails" test below installs a
    // rejected implementation that would otherwise leak into every later test.
    getPayload.mockReset()
    getPayload.mockImplementation(async () => fakePayload)
    nextHeaders.mockReset()
    resetRateLimits()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the reset email with the request headers and always reports ok', async () => {
    const headerList = new Headers({ 'x-forwarded-host': 'preview.vercel.app' })
    nextHeaders.mockResolvedValue(headerList)
    fakePayload.forgotPassword.mockResolvedValue('reset-token')

    expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
    expect(fakePayload.forgotPassword).toHaveBeenCalledWith({
      collection: 'users',
      data: { email: 'a@b.c' },
      req: { headers: headerList },
    })
  })

  it('does not reveal whether the email exists when the send fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    fakePayload.forgotPassword.mockRejectedValue(new Error('smtp down'))

    expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalled()
  })

  it('stays silent about payload initialization failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    getPayload.mockRejectedValue(new Error('db down'))

    expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalled()
  })

  describe('rate limiting', () => {
    beforeEach(() => {
      nextHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.7' }))
      fakePayload.forgotPassword.mockResolvedValue('reset-token')
    })

    it('sends up to the limit and then stops sending', async () => {
      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) {
        expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
      }
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)

      expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)
    })

    it('answers identically once limited, so the limiter is not an oracle', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) await requestPasswordReset('known@b.c')

      // Both a registered and an unregistered address get the same answer, and
      // the throttled response must not differ from the normal one.
      expect(await requestPasswordReset('known@b.c')).toEqual({ ok: true })
      expect(await requestPasswordReset('nobody@b.c')).toEqual({ ok: true })
      expect(consoleWarn).toHaveBeenCalled()
    })

    it('cannot be defeated by rotating a forged x-forwarded-for', async () => {
      // The deployment publishes the app directly, so this header is whatever
      // the caller says. The address bucket is what actually holds the line.
      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) {
        nextHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': `203.0.113.${i}` }))
        await requestPasswordReset('victim@b.c')
      }
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)

      // A brand new forged address must not buy a fresh budget for that inbox.
      nextHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.200' }))
      expect(await requestPasswordReset('victim@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)
    })

    it('still limits one caller spraying many inboxes', async () => {
      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) {
        await requestPasswordReset(`target${i}@b.c`)
      }
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)

      // Each address is under its own budget, but this caller is not.
      expect(await requestPasswordReset('target99@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)
    })

    it('gives a different caller its own budget', async () => {
      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) await requestPasswordReset('a@b.c')
      await requestPasswordReset('a@b.c')
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)

      nextHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '198.51.100.9' }))
      expect(await requestPasswordReset('someone-else@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT + 1)
    })

    it('takes the first address from a proxy chain', async () => {
      const chain = (first: string) =>
        new Headers({ 'x-forwarded-for': `${first}, 150.172.238.178` })

      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) {
        nextHeaders.mockResolvedValue(chain('203.0.113.7'))
        await requestPasswordReset('a@b.c')
      }
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)

      // A different client behind the same proxy is unaffected.
      nextHeaders.mockResolvedValue(chain('70.41.3.18'))
      expect(await requestPasswordReset('other@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT + 1)
    })

    it('falls back to x-real-ip when there is no forwarding chain', async () => {
      nextHeaders.mockResolvedValue(new Headers({ 'x-real-ip': '203.0.113.7' }))
      for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) {
        await requestPasswordReset(`target${i}@b.c`)
      }
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)

      nextHeaders.mockResolvedValue(new Headers({ 'x-real-ip': '203.0.113.7' }))
      expect(await requestPasswordReset('target99@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(FORGOT_PASSWORD_LIMIT)
    })

    it('still sends when the address headers cannot be read at all', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      nextHeaders.mockRejectedValue(new Error('no request scope'))

      expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
      expect(fakePayload.forgotPassword).toHaveBeenCalledTimes(1)
      // The warning must be about the unreadable headers, not a throttle.
      expect(consoleWarn.mock.calls.flat().join(' ')).toContain('headers')
    })
  })
})
