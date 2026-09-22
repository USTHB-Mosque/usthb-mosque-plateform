import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const fakePayload = {
  forgotPassword: vi.fn(),
}

const getPayload = vi.fn(async (..._args: unknown[]) => fakePayload)

vi.mock('payload', () => ({
  getPayload: (...args: unknown[]) => getPayload(...args),
}))

vi.mock('@/payload.config', () => ({ default: {} }))

const { requestPasswordReset } = await import('./forgot-password')

describe('features/auth/server/forgot-password.ts', () => {
  beforeEach(() => {
    fakePayload.forgotPassword.mockReset()
    getPayload.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the reset email for the given email and always reports ok', async () => {
    fakePayload.forgotPassword.mockResolvedValue('reset-token')

    expect(await requestPasswordReset('a@b.c')).toEqual({ ok: true })
    expect(fakePayload.forgotPassword).toHaveBeenCalledWith({
      collection: 'users',
      data: { email: 'a@b.c' },
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
