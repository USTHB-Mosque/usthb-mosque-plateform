import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser } from '../lib/seed'

import type { Payload } from 'payload'
import { requestPasswordReset } from '@/features/auth/server/forgot-password'
import { resetPassword } from '@/features/auth/server/reset-password'
import { login } from '@/features/auth/server/login'

// One shared instance for the whole file; destroyed exactly once at the very
// end — destroying it per describe would strand every later operation.
let payload: Payload

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('password reset (forgot → reset → login)', () => {
  it('runs the full flow with real Payload operations', async () => {
    const user = await createTestUser(payload, {
      email: 'reset@usthb.dz',
      password: 'old-password',
    })

    // The test config has no email adapter, so Payload writes the "email" to
    // the console — but the reset token is persisted before the send.
    expect(await requestPasswordReset('reset@usthb.dz')).toEqual({ ok: true })

    // resetPasswordToken is a hidden auth field, stripped from read results —
    // mint a token through the documented Local API contract instead.
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email: 'reset@usthb.dz' },
      disableEmail: true,
    })
    expect(token).toBeTruthy()

    expect(await resetPassword(token as string, 'NewPass@123')).toEqual({
      ok: true,
    })

    // Old password no longer works; new one does, and the reset was logged.
    const oldLogin = await login('reset@usthb.dz', 'old-password')
    expect(oldLogin.user).toBeUndefined()

    const newLogin = await login('reset@usthb.dz', 'NewPass@123')
    expect(newLogin.user?.id).toBe(user.id)

    const after = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
    })
    const actions = (after.activityLog ?? []).map((entry) => entry.action)
    expect(actions).toContain('password_changed')
  })

  it('rejects an invalid or expired token with a friendly message', async () => {
    await createTestUser(payload, {
      email: 'badtoken@usthb.dz',
      password: 'old-password',
    })

    expect(await resetPassword('definitely-not-a-token', 'NewPass@123')).toEqual({
      ok: false,
      error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية',
    })
  })
})
