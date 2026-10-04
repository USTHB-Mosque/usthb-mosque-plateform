import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, resetRateLimitBuckets } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { setNextHeaders } from '../lib/next-stubs'
import { FORGOT_PASSWORD_LIMIT } from '@/features/auth/password-reset-constants'

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
  resetRateLimitBuckets()
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

  it('answers identically for a known and an unknown address', async () => {
    await createTestUser(payload, {
      email: 'known@usthb.dz',
      password: 'old-password',
    })

    const known = await requestPasswordReset('known@usthb.dz')
    const unknown = await requestPasswordReset('nobody-here@usthb.dz')

    // Payload throws for an address with no user; the action must absorb that,
    // or the form becomes an oracle for probing who is registered.
    expect(unknown).toEqual({ ok: true })
    expect(unknown).toEqual(known)

    // And the unknown address must not have minted a token.
    const ghost = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { email: { equals: 'nobody-here@usthb.dz' } },
    })
    expect(ghost.totalDocs).toBe(0)
  })

  it('stops minting reset tokens once the limit is reached, against real Payload', async () => {
    await createTestUser(payload, {
      email: 'throttle@usthb.dz',
      password: 'old-password',
    })

    // resetPasswordToken is a hidden auth field, so read it past the sanitized
    // read path. Every allowed request mints a fresh one; a throttled request
    // must leave it alone. That difference is the confirmation #22 asks for,
    // with nothing mocked.
    const tokenFor = async (email: string) => {
      const row = (await payload.db.findOne({
        collection: 'users',
        where: { email: { equals: email } },
      })) as { resetPasswordToken?: string | null } | null
      return row?.resetPasswordToken ?? null
    }

    for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i += 1) {
      setNextHeaders({ 'x-forwarded-for': '203.0.113.7' })
      expect(await requestPasswordReset('throttle@usthb.dz')).toEqual({ ok: true })
    }
    const afterAllowed = await tokenFor('throttle@usthb.dz')
    expect(afterAllowed).toBeTruthy()

    // A forged address, unseen before, must not buy a fresh budget: the app is
    // published directly with no proxy, so that header is whatever the caller
    // claims. A new token would mean a new mail went out.
    setNextHeaders({ 'x-forwarded-for': '203.0.113.99' })
    expect(await requestPasswordReset('throttle@usthb.dz')).toEqual({ ok: true })
    expect(await tokenFor('throttle@usthb.dz')).toBe(afterAllowed)

    // A different member is unaffected.
    await createTestUser(payload, { email: 'bystander@usthb.dz', password: 'old-password' })
    expect(await requestPasswordReset('bystander@usthb.dz')).toEqual({ ok: true })
    expect(await tokenFor('bystander@usthb.dz')).toBeTruthy()
  })

  it('revokes every existing session when the password is reset', async () => {
    await createTestUser(payload, {
      email: 'stolen@usthb.dz',
      password: 'old-password',
    })

    // An attacker holds a session minted before the reset. This is the whole
    // point of the criterion: a password reset must invalidate it.
    const { token: attackerToken } = await loginToken(payload, {
      email: 'stolen@usthb.dz',
      password: 'old-password',
    })
    const authedAs = async (token: string) =>
      (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })).user

    expect(await authedAs(attackerToken)).toBeTruthy()

    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email: 'stolen@usthb.dz' },
      disableEmail: true,
    })

    expect(await resetPassword(token as string, 'NewPass@123')).toEqual({ ok: true })

    expect(await authedAs(attackerToken)).toBeFalsy()
  })
})
