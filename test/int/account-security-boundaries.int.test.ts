import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createLocalReq, defaultBeginTransaction, refreshOperation, type Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { makeAuthHeaders, setNextHeaders, clearNextContext } from '../lib/next-stubs'
import {
  withAccountLock,
  recordReauthentication,
  hasRecentAuthentication,
  ensureAccountSecurity,
  assertSessionIssuance,
  consumeSecurityChallenge,
  createSecurityChallenge,
  probePassword,
  securityBeforeLogin,
} from '@/shared/lib/account-security'
import { lockAccountEmail, markEmailVerified } from '@/shared/lib/account-emails'
import {
  createSessionForUser,
  clearPayloadTokenCookie,
  getAuthenticatedUser,
  getPayloadWithUser,
} from '@/shared/lib/auth'
import { validateProfilePicture, deleteUnusedOwnedPicture } from '@/shared/lib/profile-picture'
import { createTestMedia } from '../lib/factories'
import { beginAdminReauthentication } from '@/features/admin/server/security'
import {
  getAdminTwoFactorSettings,
  completeAdminReauthentication,
  beginAdminTwoFactorEnrollment,
  confirmAdminTwoFactorEnrollment,
  getAdminReauthenticationStatus,
} from '@/features/admin/server/security'

let payload: Payload
let admin: User
beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  admin = await createTestUser(payload, { role: 'admin' })
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await payload.db.destroy?.()
})

async function authenticated() {
  const login = await loginToken(payload, { email: admin.email, password: 'correct horse battery' })
  setNextHeaders(makeAuthHeaders(login.token))
  const result = await payload.auth({ headers: new Headers(makeAuthHeaders(login.token)) })
  if (!result.user) throw new Error('Fixture failed to authenticate')
  return { user: result.user as User, req: await createLocalReq({ user: result.user }, payload) }
}

it('refuses missing transaction and session capabilities against the real adapter', async () => {
  const req = await createLocalReq({}, payload)
  await expect(lockAccountEmail(payload, admin.email, req)).rejects.toThrow('transaction')
  await expect(recordReauthentication(payload, admin)).rejects.toThrow('جلسة')
  await expect(
    recordReauthentication(payload, { ...admin, _sid: 'missing' } as User),
  ).rejects.toThrow('الجلسة')
  const begin = payload.db.beginTransaction
  // Use Payload's actual unsupported-transaction strategy, not fake data or
  // a mocked database; the guard must reject before any SQL mutation.
  const unsupported = defaultBeginTransaction()
  payload.db.beginTransaction = async () => unsupported()
  try {
    await expect(withAccountLock(payload, admin.id, async () => true)).rejects.toThrow(
      'transaction',
    )
  } finally {
    payload.db.beginTransaction = begin
  }
  await expect(markEmailVerified(payload, admin.id, 'absent@usthb.dz', req)).rejects.toThrow(
    'transaction',
  )
})

it('fails closed when the password-aborting hook is misconfigured', async () => {
  const hooks = payload.collections.users.config.hooks.beforeLogin
  payload.collections.users.config.hooks.beforeLogin = hooks.filter(
    (hook) => hook !== securityBeforeLogin,
  )
  try {
    await expect(probePassword(payload, admin.email, 'correct horse battery')).rejects.toThrow(
      'did not abort',
    )
    expect(
      (await payload.findByID({ collection: 'users', id: admin.id, overrideAccess: true }))
        .sessions,
    ).toEqual([])
  } finally {
    payload.collections.users.config.hooks.beforeLogin = hooks
  }
})

it('never marks an absent mailbox as verified', async () => {
  await expect(
    withAccountLock(payload, admin.id, (req) =>
      markEmailVerified(payload, admin.id, 'absent@usthb.dz', req),
    ),
  ).rejects.toThrow('البريد غير موجود في حسابك')
  const addresses = await payload.find({
    collection: 'account-emails',
    where: { user: { equals: admin.id } },
    overrideAccess: true,
  })
  expect(addresses.docs).toHaveLength(1)
  expect(addresses.docs[0].verifiedAt).toBeNull()
})

it('rechecks an already-enabled factor inside the enrollment confirmation transaction', async () => {
  const { user } = await authenticated()
  const mail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
  await beginAdminReauthentication('correct horse battery')
  const before = await getAdminReauthenticationStatus()
  const pending = await beginAdminTwoFactorEnrollment()
  if (!pending.ok) throw new Error('Fixture enrollment failed')
  const code = String(mail.mock.calls.at(-1)?.[0].html).match(/data-security-code>(\d{6})</)![1]
  // Arrange an imported enrolled state retaining the revision and assured SID.
  // Client collection writes cannot arrange this state; their access is denied.
  await withAccountLock(payload, user.id, async (req) => {
    const security = await ensureAccountSecurity(payload, user.id, req)
    await payload.update({
      collection: 'account-security',
      id: security.id,
      data: {
        emailTwoFactorEnabled: true,
        assuredSessions: { [(user as User & { _sid: string })._sid]: security.revision },
      },
      req,
    })
  })
  expect(await confirmAdminTwoFactorEnrollment(pending.challenge, code)).toMatchObject({
    ok: false,
  })
  expect(await getAdminReauthenticationStatus()).toEqual(before)
})

it('binds password confirmation to the original security revision', async () => {
  const proof = await probePassword(payload, admin.email, 'correct horse battery')
  await payload.update({
    collection: 'users',
    id: admin.id,
    data: { password: 'different-revision-password' },
    overrideAccess: true,
  })
  const req = await createLocalReq({}, payload)
  const current = await payload.findByID({
    collection: 'users',
    id: admin.id,
    overrideAccess: true,
  })
  await expect(assertSessionIssuance(payload, current, req, proof)).rejects.toThrow()
  await expect(createSecurityChallenge(payload, proof, 'login', proof.email)).rejects.toThrow()
})

it('rejects legacy deleted rows even when their sessions were not cleared by a hook', async () => {
  const { user } = await authenticated()
  await payload.db.updateOne({
    collection: 'users',
    id: user.id,
    data: { deletedAt: new Date().toISOString() },
    returning: false,
  })
  expect(await getAuthenticatedUser({ allowAdmin: true })).toBeUndefined()
  expect(await getPayloadWithUser({ allowAdmin: true })).toBeNull()
})

it('handles deletion between password acceptance and the sanitized identity read', async () => {
  const original = payload.findByID.bind(payload)
  const spy = vi.spyOn(payload, 'findByID')
  spy.mockImplementation(async (options) => {
    if (options.collection === 'users' && options.showHiddenFields === false) {
      await payload.db.updateOne({
        collection: 'users',
        id: admin.id,
        data: { deletedAt: new Date().toISOString() },
        returning: false,
      })
    }
    return original(options)
  })
  await expect(probePassword(payload, admin.email, 'correct horse battery')).rejects.toThrow()
})

it('rejects non-flow primary changes and stale second-factor confirmation', async () => {
  const { user } = await authenticated()
  expect(await getAdminTwoFactorSettings()).toEqual({ enabled: false, recoveryCodesRemaining: 0 })
  await beginAdminReauthentication('correct horse battery')
  const req = await createLocalReq({ user }, payload)
  await expect(
    payload.update({
      collection: 'users',
      id: user.id,
      data: { email: 'unchecked-change@usthb.dz' },
      overrideAccess: false,
      req,
    }),
  ).rejects.toThrow('وثّق')
  const mail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
  const pending = await createSecurityChallenge(payload, user, 'reauth', user.email)
  expect(await completeAdminReauthentication(pending.challenge, 'wrong')).toMatchObject({
    ok: false,
  })
  await createSecurityChallenge(payload, user, 'login', user.email)
  await withAccountLock(payload, user.id, async (locked) => {
    const security = await ensureAccountSecurity(payload, user.id, locked)
    await payload.update({
      collection: 'account-security',
      id: security.id,
      data: { emailTwoFactorEnabled: true },
      req: locked,
    })
  })
  // The pending reauth attempt prevents a resend in the cooldown window.
  const { beginAdminReauthentication: begin } = await import('@/features/admin/server/security')
  // Restore an explicitly arranged fully-assured session for this fixture.
  const currentSecurity = await payload.find({
    collection: 'account-security',
    overrideAccess: true,
  })
  const sid = (user as User & { _sid: string })._sid
  await payload.update({
    collection: 'account-security',
    id: currentSecurity.docs[0].id,
    data: {
      assuredSessions: { [sid]: currentSecurity.docs[0].revision },
      reauthenticatedSessions: {},
    },
    overrideAccess: true,
  })
  expect(await begin('correct horse battery')).toMatchObject({ ok: false })
  expect(mail).toHaveBeenCalled()
})

it('does not accept old, missing or deleted session proof', async () => {
  const { user, req } = await authenticated()
  await expect(
    recordReauthentication(payload, user, undefined, new Date(Date.now() - 1).toISOString()),
  ).rejects.toThrow('تأكيد')
  await recordReauthentication(payload, user)
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { sessions: [] },
    overrideAccess: true,
  })
  expect(await hasRecentAuthentication(payload, user)).toBe(false)
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { deletedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  const deleted = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true })
  await expect(assertSessionIssuance(payload, deleted, req)).rejects.toThrow()
  await expect(createSessionForUser(payload, deleted)).rejects.toThrow()
})

it('requires issuer factor proof and the allowed role at the final session write', async () => {
  const { user, req } = await authenticated()
  await expect(createSessionForUser(payload, user, { allowedRoles: ['user'] })).rejects.toThrow(
    'مصرح',
  )
  await withAccountLock(payload, user.id, async (locked) => {
    const security = await ensureAccountSecurity(payload, user.id, locked)
    await payload.update({
      collection: 'account-security',
      id: security.id,
      data: { emailTwoFactorEnabled: true },
      req: locked,
    })
  })
  await expect(assertSessionIssuance(payload, user, req)).rejects.toThrow()
  await expect(createSessionForUser(payload, user)).rejects.toThrow()
  const projection = await payload.findByID({
    collection: 'users',
    id: user.id,
    select: { fullName: true },
    overrideAccess: true,
  })
  expect((projection as User).sessions).toEqual([])
})

it('preserves proof freshness on native refresh and rejects revoked or anonymous requests', async () => {
  const { user, req } = await authenticated()
  await beginAdminReauthentication('correct horse battery')
  const refreshed = await refreshOperation({ collection: payload.collections.users, req })
  expect(refreshed.refreshedToken).toBeTruthy()
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { sessions: [] },
    overrideAccess: true,
  })
  await expect(refreshOperation({ collection: payload.collections.users, req })).rejects.toThrow()
  const visitor = await createLocalReq({}, payload)
  await expect(
    refreshOperation({ collection: payload.collections.users, req: visitor }),
  ).rejects.toThrow()
})

it('fails unknown/malformed challenge input without executing its mutation', async () => {
  const execute = vi.fn()
  for (const [nonce, code] of [
    ['bad', '000000'],
    ['a'.repeat(64), '000000'],
    ['a'.repeat(64), 'x'.repeat(65)],
    [null, '000000'],
    ['a'.repeat(64), null],
  ]) {
    expect(
      await consumeSecurityChallenge(
        payload,
        nonce as string,
        code as string,
        'login',
        undefined,
        execute,
      ),
    ).toMatchObject({ ok: false })
  }
  expect(execute).not.toHaveBeenCalled()
})

it('enforces challenge delivery budgets and keeps recovery available on reauth mail failure', async () => {
  const { user } = await authenticated()
  const mail = vi.spyOn(payload, 'sendEmail').mockRejectedValue(new Error('offline'))
  expect(await createSecurityChallenge(payload, user, 'reauth', user.email)).toMatchObject({
    deliveryFailed: true,
  })
  await expect(createSecurityChallenge(payload, user, 'reauth', user.email)).rejects.toThrow(
    'انتظر',
  )
  mail.mockResolvedValue(undefined)
  // Real stored rows arrange an exhausted account/purpose budget.
  const attempts = await payload.find({ collection: 'auth-challenges', overrideAccess: true })
  for (let index = 0; index < 4; index++) {
    const row = attempts.docs[0]
    await payload.create({
      collection: 'auth-challenges',
      data: {
        user: user.id,
        purpose: 'reauth',
        nonceHash: String(index),
        codeHash: row.codeHash,
        email: user.email,
        revision: 0,
        attempts: 0,
        expiresAt: row.expiresAt,
      },
      overrideAccess: true,
    })
  }
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
  await expect(createSecurityChallenge(payload, user, 'reauth', user.email)).rejects.toThrow(
    'انتظر',
  )
})

it('does not re-use public/private/foreign profile uploads as another account picture', async () => {
  const { user, req } = await authenticated()
  const media = await createTestMedia(payload, { owner: user.id })
  await expect(
    validateProfilePicture({ data: { profilePicture: media.id }, operation: 'create', req }),
  ).rejects.toThrow('احفظ')
  expect(
    await validateProfilePicture({ data: { profilePicture: media.id }, operation: 'update', req }),
  ).toEqual({ profilePicture: media.id })
  await payload.db.updateOne({
    collection: 'media',
    id: media.id,
    data: { mimeType: null },
    returning: false,
  })
  await expect(
    validateProfilePicture({
      data: { profilePicture: media.id },
      originalDoc: user,
      operation: 'update',
      req,
    }),
  ).rejects.toThrow('يملكها')
  await deleteUnusedOwnedPicture(payload, user.id)
  const privateImage = await createTestMedia(payload, { owner: user.id, isPrivate: true })
  await deleteUnusedOwnedPicture(payload, user.id, privateImage.id)
  expect(
    (await payload.findByID({ collection: 'media', id: privateImage.id, overrideAccess: true })).id,
  ).toBe(privateImage.id)
  await clearPayloadTokenCookie()
})
