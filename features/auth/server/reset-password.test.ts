import { describe, expect, it, vi, beforeEach } from 'vitest'

const fakePayload = {
  resetPassword: vi.fn(),
}

const logActivity = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => fakePayload,
}))

vi.mock('@/payload.config', () => ({ default: {} }))

vi.mock('@/utils/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}))

const { resetPassword } = await import('./reset-password')

describe('features/auth/server/reset-password.ts', () => {
  beforeEach(() => {
    fakePayload.resetPassword.mockReset()
    logActivity.mockReset()
  })

  it('resets the password with the token and logs password_changed', async () => {
    fakePayload.resetPassword.mockResolvedValue({ user: { id: 12 } })

    expect(await resetPassword('token-1', 'NewPass@123')).toEqual({ ok: true })
    expect(fakePayload.resetPassword).toHaveBeenCalledWith({
      collection: 'users',
      data: { token: 'token-1', password: 'NewPass@123' },
      overrideAccess: true,
    })
    expect(logActivity).toHaveBeenCalledTimes(1)
    expect(logActivity.mock.calls[0][2]).toBe('password_changed')
  })

  it('still reports success when activity logging fails', async () => {
    fakePayload.resetPassword.mockResolvedValue({ user: { id: 12 } })
    logActivity.mockRejectedValue(new Error('log write failed'))

    expect(await resetPassword('token-1', 'NewPass@123')).toEqual({ ok: true })
  })

  it('skips activity logging when the result carries no user', async () => {
    fakePayload.resetPassword.mockResolvedValue({ user: undefined })

    expect(await resetPassword('token-1', 'NewPass@123')).toEqual({ ok: true })
    expect(logActivity).not.toHaveBeenCalled()
  })

  it('maps an invalid or expired token to a friendly Arabic message', async () => {
    fakePayload.resetPassword.mockRejectedValue(
      new Error('Token is either invalid or has expired.'),
    )

    expect(await resetPassword('bad-token', 'NewPass@123')).toEqual({
      ok: false,
      error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية',
    })
  })

  it('returns a generic Arabic message for other failures', async () => {
    fakePayload.resetPassword.mockRejectedValue(new Error('boom'))

    expect(await resetPassword('token-1', 'NewPass@123')).toEqual({
      ok: false,
      error: 'حدث خطأ، حاول مرة أخرى',
    })
  })

  it('falls back to a generic Arabic message for non-Error failures', async () => {
    fakePayload.resetPassword.mockRejectedValue('not-an-error')

    expect(await resetPassword('token-1', 'NewPass@123')).toEqual({
      ok: false,
      error: 'حدث خطأ، حاول مرة أخرى',
    })
  })
})
