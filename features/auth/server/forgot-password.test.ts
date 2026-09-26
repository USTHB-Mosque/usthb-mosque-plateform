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

describe('features/auth/server/forgot-password.ts', () => {
  beforeEach(() => {
    fakePayload.forgotPassword.mockReset()
    getPayload.mockClear()
    nextHeaders.mockReset()
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
})
