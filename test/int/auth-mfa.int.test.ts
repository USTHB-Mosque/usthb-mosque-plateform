import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import {
  clearNextContext,
  getLastSetCookieOptions,
  makeAuthHeaders,
  setNextHeaders,
} from '../lib/next-stubs'
import {
  beginAdminReauthentication,
  beginAdminTwoFactorEnrollment,
  confirmAdminTwoFactorEnrollment,
  getAdminTwoFactorSettings,
  completeAdminReauthentication,
  getAdminReauthenticationStatus,
  regenerateAdminRecoveryCodes,
  disableAdminTwoFactor,
} from '@/features/admin/server/security'
import { login } from '@/features/auth/server/login'
import { completeLoginChallenge } from '@/features/auth/server/mfa'
import { changeAdminPassword, revokeAdminSession } from '@/features/admin/server/account'

let payload: Payload
beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await payload.db.destroy?.()
})

async function enrolledAdmin() {
  const admin = await createTestUser(payload, { role: 'admin' })
  const initial = await loginToken(payload, {
    email: admin.email,
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(initial.token))
  const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
  await beginAdminReauthentication('correct horse battery')
  const pending = await beginAdminTwoFactorEnrollment()
  if (!pending.ok) throw new Error('Enrollment challenge failed')
  const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
  const enabled = await confirmAdminTwoFactorEnrollment(pending.challenge, code)
  if (!enabled.ok) throw new Error('Enrollment failed')
  const token = String(getLastSetCookieOptions('payload-token')?.value)
  setNextHeaders(makeAuthHeaders(token))
  // Enrollment just proved both factors; later-management scenarios start
  // after its five-minute proof has expired, without expiring the session.
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60_000)
  return { admin, send, recoveryCodes: enabled.recoveryCodes, token }
}

describe('admin email OTP enrollment', () => {
  for (const enabled of [false, true]) {
    it(`resets the failed-password budget after a successful ${enabled ? 'second-factor' : 'password-only'} login`, async () => {
      const fixture = enabled
        ? await enrolledAdmin()
        : { admin: await createTestUser(payload, { role: 'admin' }), recoveryCodes: [] }
      clearNextContext()
      for (let index = 0; index < 4; index++)
        expect((await login(fixture.admin.email, 'wrong-password')).user).toBeUndefined()
      const accepted = await login(fixture.admin.email, 'correct horse battery')
      let authenticatedUser = accepted.user
      if (enabled) {
        expect(accepted.challenge).toBeTruthy()
        const completed = await completeLoginChallenge(
          accepted.challenge!,
          fixture.recoveryCodes[0],
        )
        expect(completed).toMatchObject({ ok: true })
        if (completed.ok) authenticatedUser = completed.user
      } else expect(accepted.user?.id).toBe(fixture.admin.id)
      expect((await login(fixture.admin.email, 'wrong-password')).user).toBeUndefined()
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
      const again = await login(fixture.admin.email, 'correct horse battery')
      if (enabled) expect(again.challenge).toBeTruthy()
      else expect(again.user?.id).toBe(fixture.admin.id)
      for (const secret of ['loginAttempts', 'lockUntil', 'hash', 'salt'])
        expect(authenticatedUser).not.toHaveProperty(secret)
    })
  }
  it('denies anonymous management and never exposes server-owned authentication records', async () => {
    expect(await getAdminTwoFactorSettings()).toBeNull()
    expect(await beginAdminTwoFactorEnrollment()).toMatchObject({ ok: false })
    expect(await confirmAdminTwoFactorEnrollment('invalid', '000000')).toMatchObject({ ok: false })
    expect(await completeAdminReauthentication('invalid', '000000')).toMatchObject({ ok: false })
    expect(await regenerateAdminRecoveryCodes()).toMatchObject({ ok: false })
    expect(await disableAdminTwoFactor()).toMatchObject({ ok: false })
    expect(await completeLoginChallenge('invalid', '000000')).toMatchObject({ ok: false })
    const { admin, token } = await enrolledAdmin()
    const { user } = await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })
    for (const collection of ['account-security', 'auth-challenges'] as const) {
      await expect(payload.find({ collection, user, overrideAccess: false })).rejects.toMatchObject(
        { status: 403 },
      )
    }
    const secret = await payload.find({
      collection: 'account-security',
      where: { user: { equals: admin.id } },
      overrideAccess: true,
    })
    await expect(
      payload.update({
        collection: 'account-security',
        id: secret.docs[0].id,
        data: { emailTwoFactorEnabled: false },
        user,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
  })
  it('never returns password hashes or reset secrets from the password-probe login', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const result = await login(admin.email, 'correct horse battery')
    expect(result.user?.id).toBe(admin.id)
    for (const field of ['hash', 'salt', 'resetPasswordToken', 'resetPasswordExpiration']) {
      expect(result.user).not.toHaveProperty(field)
    }
  })

  it('never leaves an old-password session alive when login races a credential change', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    await Promise.all([
      login(admin.email, 'correct horse battery'),
      payload.update({
        collection: 'users',
        id: admin.id,
        data: { password: 'changed-during-login' },
        overrideAccess: true,
      }),
    ])
    const issued = getLastSetCookieOptions('payload-token')?.value
    if (issued)
      expect(
        (await payload.auth({ headers: new Headers(makeAuthHeaders(issued)) })).user,
      ).toBeNull()
  })
  it('enables only after mailbox proof and invalidates all pre-enrollment tokens', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const current = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    const stolen = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(current.token))
    await beginAdminReauthentication('correct horse battery')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)

    const pending = await beginAdminTwoFactorEnrollment()
    expect(pending).toMatchObject({ ok: true, challenge: expect.any(String) })
    expect(await getAdminTwoFactorSettings()).toMatchObject({ enabled: false })
    const html = String(send.mock.calls[0][0].html)
    const code = html.match(/data-security-code>(\d{6})</)?.[1]
    expect(code).toBeTruthy()
    if (!pending.ok || !('challenge' in pending) || !code)
      throw new Error('Missing enrollment mail')
    const enabled = await confirmAdminTwoFactorEnrollment(pending.challenge, code)
    expect(enabled).toMatchObject({ ok: true, recoveryCodes: expect.any(Array) })
    if (!enabled.ok) throw new Error('Enrollment failed')
    expect(enabled.recoveryCodes).toHaveLength(10)
    expect(new Set(enabled.recoveryCodes).size).toBe(10)

    for (const { token } of [current, stolen]) {
      expect((await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })).user).toBeNull()
    }
    const fresh = getLastSetCookieOptions('payload-token')?.value
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(String(fresh))) })).user?.id,
    ).toBe(admin.id)
    await expect(
      payload.login({
        collection: 'users',
        data: { email: admin.email, password: 'correct horse battery' },
      }),
    ).rejects.toThrow()
  })

  it('does not authenticate a password-only login and consumes the email challenge exactly once', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const initial = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(initial.token))
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    await beginAdminReauthentication('correct horse battery')
    const enrollment = await beginAdminTwoFactorEnrollment()
    if (!enrollment.ok) throw new Error('Missing enrollment challenge')
    await confirmAdminTwoFactorEnrollment(
      enrollment.challenge,
      String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1],
    )

    clearNextContext()
    const pending = await login(admin.email, 'correct horse battery')
    expect(pending.user).toBeUndefined()
    expect(pending.challenge).toEqual(expect.any(String))
    expect(getLastSetCookieOptions('payload-token')).toBeUndefined()
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    const completed = await completeLoginChallenge(pending.challenge!, code)
    expect(completed).toMatchObject({ ok: true, user: { id: admin.id } })
    expect(
      (
        await payload.auth({
          headers: new Headers(
            makeAuthHeaders(String(getLastSetCookieOptions('payload-token')?.value)),
          ),
        })
      ).user?.id,
    ).toBe(admin.id)
    expect(await completeLoginChallenge(pending.challenge!, code)).toMatchObject({ ok: false })
  })

  it('requires the enabled second factor for recent re-authentication', async () => {
    const { send } = await enrolledAdmin()
    const pending = await beginAdminReauthentication('correct horse battery')
    expect(pending).toMatchObject({ ok: true, challenge: expect.any(String) })
    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: false })
    if (!pending.ok || !('challenge' in pending)) throw new Error('Missing second factor')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    expect(await completeAdminReauthentication(pending.challenge, code)).toMatchObject({ ok: true })
    expect(await getAdminReauthenticationStatus()).toMatchObject({ recent: true })
  })

  it('cannot extend identity proof or replace recovery codes by enrolling an enabled factor again', async () => {
    const { send } = await enrolledAdmin()
    const proof = await beginAdminReauthentication('correct horse battery')
    if (!proof.ok || !('challenge' in proof)) throw new Error('Missing identity challenge')
    await completeAdminReauthentication(
      proof.challenge,
      String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1],
    )
    const before = await getAdminReauthenticationStatus()
    const deliveries = send.mock.calls.length
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 4 * 60_000)

    expect(await beginAdminTwoFactorEnrollment()).toMatchObject({ ok: false })
    expect(await getAdminReauthenticationStatus()).toEqual(before)
    expect(send.mock.calls).toHaveLength(deliveries)
    expect(await getAdminTwoFactorSettings()).toMatchObject({
      enabled: true,
      recoveryCodesRemaining: 10,
    })
  })

  it('native password reset commits the password but grants no session and retains 2FA', async () => {
    const { admin, token } = await enrolledAdmin()
    const resetToken = await payload.forgotPassword({
      collection: 'users',
      data: { email: admin.email },
      disableEmail: true,
    })
    const result = await payload.resetPassword({
      collection: 'users',
      overrideAccess: false,
      data: { token: resetToken!, password: 'reset-password-146' },
    })
    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.sessions).toHaveLength(0)
    for (const stale of [token, String(result.token)]) {
      expect((await payload.auth({ headers: new Headers(makeAuthHeaders(stale)) })).user).toBeNull()
    }
    clearNextContext()
    expect(await login(admin.email, 'correct horse battery')).toEqual({ user: undefined })
    expect(await login(admin.email, 'reset-password-146')).toMatchObject({
      user: undefined,
      challenge: expect.any(String),
    })
  })

  it('uses a recovery code once, and invalidates the old set when codes are regenerated', async () => {
    const { admin, recoveryCodes, send } = await enrolledAdmin()
    clearNextContext()
    const first = await login(admin.email, 'correct horse battery')
    expect(await completeLoginChallenge(first.challenge!, recoveryCodes[0])).toMatchObject({
      ok: true,
    })
    setNextHeaders(makeAuthHeaders(String(getLastSetCookieOptions('payload-token')?.value)))
    expect((await getAdminTwoFactorSettings())?.recoveryCodesRemaining).toBe(9)
    const pending = await beginAdminReauthentication('correct horse battery')
    if (!pending.ok || !('challenge' in pending)) throw new Error('Missing reauth challenge')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    await completeAdminReauthentication(pending.challenge, code)
    const regenerated = await regenerateAdminRecoveryCodes()
    expect(regenerated).toMatchObject({ ok: true, recoveryCodes: expect.any(Array) })
    if (!regenerated.ok) throw new Error('Missing new codes')
    expect(regenerated.recoveryCodes).not.toContain(recoveryCodes[0])
    setNextHeaders(makeAuthHeaders(String(getLastSetCookieOptions('payload-token')?.value)))
    expect((await getAdminTwoFactorSettings())?.recoveryCodesRemaining).toBe(10)

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
    clearNextContext()
    const second = await login(admin.email, 'correct horse battery')
    expect(await completeLoginChallenge(second.challenge!, recoveryCodes[1])).toMatchObject({
      ok: false,
    })
    expect(
      await completeLoginChallenge(second.challenge!, regenerated.recoveryCodes[0]),
    ).toMatchObject({ ok: true })
  })

  it('requires recent reauth to disable 2FA and invalidates old sessions when it changes', async () => {
    const { admin, token, send } = await enrolledAdmin()
    expect(await disableAdminTwoFactor()).toMatchObject({ ok: false })
    const pending = await beginAdminReauthentication('correct horse battery')
    if (!pending.ok || !('challenge' in pending)) throw new Error('Missing reauth challenge')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    await completeAdminReauthentication(pending.challenge, code)
    expect(await disableAdminTwoFactor()).toMatchObject({ ok: true })
    expect((await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })).user).toBeNull()
    const fresh = String(getLastSetCookieOptions('payload-token')?.value)
    setNextHeaders(makeAuthHeaders(fresh))
    expect(await getAdminTwoFactorSettings()).toMatchObject({
      enabled: false,
      recoveryCodesRemaining: 0,
    })
    expect(
      (
        await payload.login({
          collection: 'users',
          data: { email: admin.email, password: 'correct horse battery' },
        })
      ).token,
    ).toBeTruthy()
  })

  it('revokes an enrolled device while preserving the other device’s second-factor assurance', async () => {
    const { admin, token, send, recoveryCodes } = await enrolledAdmin()
    clearNextContext()
    const loginAttempt = await login(admin.email, 'correct horse battery')
    expect(await completeLoginChallenge(loginAttempt.challenge!, recoveryCodes[0])).toMatchObject({
      ok: true,
    })
    const remainingToken = String(getLastSetCookieOptions('payload-token')?.value)
    setNextHeaders(makeAuthHeaders(remainingToken))
    const proof = await beginAdminReauthentication('correct horse battery')
    if (!proof.ok || !('challenge' in proof)) throw new Error('Missing identity challenge')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    expect(await completeAdminReauthentication(proof.challenge, code)).toMatchObject({ ok: true })
    const revokedSid = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sid

    expect(await revokeAdminSession(revokedSid, '')).toEqual({ ok: true })
    expect((await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })).user).toBeNull()
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(remainingToken)) })).user?.id,
    ).toBe(admin.id)
    expect(await getAdminTwoFactorSettings()).toMatchObject({
      enabled: true,
      recoveryCodesRemaining: 9,
    })
  })

  it('rotates a password without bypassing or disabling the enrolled second factor', async () => {
    const { admin, token, send } = await enrolledAdmin()
    const pending = await beginAdminReauthentication('correct horse battery')
    if (!pending.ok || !('challenge' in pending)) throw new Error('Missing reauth challenge')
    await completeAdminReauthentication(
      pending.challenge,
      String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1],
    )
    const data = new FormData()
    data.set('currentPassword', 'correct horse battery')
    data.set('newPassword', 'changed-with-two-factors')
    data.set('confirmPassword', 'changed-with-two-factors')
    expect(await changeAdminPassword(data)).toMatchObject({ ok: true })
    expect((await payload.auth({ headers: new Headers(makeAuthHeaders(token)) })).user).toBeNull()
    setNextHeaders(makeAuthHeaders(String(getLastSetCookieOptions('payload-token')?.value)))
    expect(await getAdminTwoFactorSettings()).toMatchObject({ enabled: true })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: admin.email, password: 'changed-with-two-factors' },
      }),
    ).rejects.toThrow()
  })

  it('allows recovery-code login when the mail transport is unavailable', async () => {
    const { admin, send, recoveryCodes } = await enrolledAdmin()
    clearNextContext()
    send.mockRejectedValue(new Error('SMTP unavailable'))
    const pending = await login(admin.email, 'correct horse battery')
    expect(pending).toMatchObject({
      user: undefined,
      challenge: expect.any(String),
      deliveryFailed: true,
    })
    expect(await completeLoginChallenge(pending.challenge!, recoveryCodes[0])).toMatchObject({
      ok: true,
      user: { id: admin.id },
    })
  })

  it('limits guesses and refuses even a correct code at expiration', async () => {
    const { admin, send } = await enrolledAdmin()
    clearNextContext()
    const pending = await login(admin.email, 'correct horse battery')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    const wrong = code === '000000' ? '111111' : '000000'
    for (let index = 0; index < 5; index++)
      expect(await completeLoginChallenge(pending.challenge!, wrong)).toMatchObject({ ok: false })
    expect(await completeLoginChallenge(pending.challenge!, code)).toMatchObject({ ok: false })
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
    const newer = await login(admin.email, 'correct horse battery')
    const newCode = String(send.mock.calls.at(-1)?.[0].html).match(
      /data-security-code>(\d{6})</,
    )![1]
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(newer.expiresAt!))
    expect(await completeLoginChallenge(newer.challenge!, newCode)).toMatchObject({ ok: false })
  })

  it('consumes a recovery code atomically when two clients submit the same challenge', async () => {
    const { admin, recoveryCodes } = await enrolledAdmin()
    clearNextContext()
    const pending = await login(admin.email, 'correct horse battery')
    const results = await Promise.all([
      completeLoginChallenge(pending.challenge!, recoveryCodes[0]),
      completeLoginChallenge(pending.challenge!, recoveryCodes[0]),
    ])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.filter((result) => !result.ok)).toHaveLength(1)
  })

  it('does not activate enrollment when mail fails and rejects wrong-device and wrong-purpose proof', async () => {
    const admin = await createTestUser(payload, { role: 'admin' })
    const first = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    const second = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(first.token))
    expect(await beginAdminTwoFactorEnrollment()).toMatchObject({ ok: false })
    expect(await regenerateAdminRecoveryCodes()).toMatchObject({ ok: false })
    expect(await disableAdminTwoFactor()).toMatchObject({ ok: false })
    await beginAdminReauthentication('correct horse battery')
    expect(await regenerateAdminRecoveryCodes()).toMatchObject({ ok: false })
    expect(await disableAdminTwoFactor()).toMatchObject({ ok: false })
    const send = vi.spyOn(payload, 'sendEmail').mockRejectedValue('mail unavailable')
    expect(await beginAdminTwoFactorEnrollment()).toMatchObject({ ok: false })
    expect(await getAdminTwoFactorSettings()).toMatchObject({ enabled: false })
    send.mockResolvedValue(undefined)
    expect(await beginAdminTwoFactorEnrollment()).toMatchObject({ ok: false })
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
    const pending = await beginAdminTwoFactorEnrollment()
    if (!pending.ok) throw new Error('Missing challenge')
    const code = String(send.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
    expect(await completeLoginChallenge(pending.challenge, code)).toMatchObject({ ok: false })
    setNextHeaders(makeAuthHeaders(second.token))
    expect(await confirmAdminTwoFactorEnrollment(pending.challenge, code)).toMatchObject({
      ok: false,
    })
    setNextHeaders(makeAuthHeaders(first.token))
    const other = await createTestUser(payload, { role: 'admin' })
    setNextHeaders(
      makeAuthHeaders(
        (await loginToken(payload, { email: other.email, password: 'correct horse battery' }))
          .token,
      ),
    )
    expect(await confirmAdminTwoFactorEnrollment(pending.challenge, code)).toMatchObject({
      ok: false,
    })
  })
})
