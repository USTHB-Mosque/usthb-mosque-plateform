import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import {
  clearNextContext,
  getLastSetCookieOptions,
  makeAuthHeaders,
  setNextHeaders,
} from '../lib/next-stubs'

import type { Payload } from 'payload'
import { createLocalReq } from 'payload'
import { withAccountLock } from '@/shared/lib/account-security'
import type { User } from '@/payload-types'
import {
  changeAdminPassword,
  getAdminSettingsData,
  getAdminSecurityData,
  revokeAdminSession,
  updateAdminNotificationPreferences,
  updateAdminPhone,
  updateAdminSettingsField,
  updateAdminAccountInfo,
  updateAdminPassword,
} from '@/features/admin/server/account'

let payload: Payload
let admin: User

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

async function loginAsAdmin() {
  const { token } = await loginToken(payload, {
    email: admin.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  admin = await createTestUser(payload, {
    role: 'admin',
    email: 'admin@settings-int.usthb.dz',
    verified: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})
afterEach(() => vi.restoreAllMocks())

describe('getAdminSettingsData', () => {
  it('returns null for an anonymous caller', async () => {
    expect(await getAdminSettingsData()).toBeNull()
  })

  it('returns the authenticated admin user', async () => {
    await loginAsAdmin()

    const data = await getAdminSettingsData()
    expect(String(data?.user.id)).toBe(String(admin.id))
    expect(data?.user.role).toBe('admin')
    expect(data?.user.notificationPreferences).toBeTruthy()
  })
})

describe('updateAdminSettingsField', () => {
  it('requires names for profile edits and fresh proof for password-only forms', async () => {
    expect(await updateAdminAccountInfo(formData({}))).toMatchObject({ ok: false })
    await loginAsAdmin()
    expect(await updateAdminAccountInfo(formData({}))).toMatchObject({ ok: false })
    expect(await updateAdminAccountInfo(formData({ firstName: 'محمد' }))).toMatchObject({
      ok: false,
    })
    expect(
      await changeAdminPassword(
        formData({
          newPassword: 'without-current-proof',
          confirmPassword: 'without-current-proof',
        }),
      ),
    ).toMatchObject({ ok: false })
    const { beginAdminReauthentication } = await import('@/features/admin/server/security')
    await beginAdminReauthentication('correct horse battery')
    expect(
      await changeAdminPassword(
        formData({ newPassword: 'with-current-proof', confirmPassword: 'with-current-proof' }),
      ),
    ).toMatchObject({ ok: true })
  })
  it('edits the admin name fields and phone while keeping the verified-email flow separate', async () => {
    await loginAsAdmin()
    expect(
      await updateAdminAccountInfo(
        formData({ firstName: 'محمد', lastName: 'عبد الرحمن', phone: '0551234567' }),
      ),
    ).toEqual({ ok: true })
    expect((await getAdminSettingsData())?.user).toMatchObject({
      firstName: 'محمد',
      lastName: 'عبد الرحمن',
      fullName: 'محمد عبد الرحمن',
      phone: '0551234567',
      email: admin.email,
    })
  })
  it('rejects an anonymous caller', async () => {
    expect(await updateAdminSettingsField(formData({ phone: '0550000000' }), 'phone')).toEqual({
      ok: false,
      error: 'غير مصرح',
    })
  })

  it('rejects an empty value', async () => {
    await loginAsAdmin()

    expect(await updateAdminSettingsField(formData({ phone: '   ' }), 'phone')).toEqual({
      ok: false,
      error: 'القيمة مطلوبة',
    })
  })

  it('rejects a field outside the allowlist', async () => {
    await loginAsAdmin()

    expect(await updateAdminSettingsField(formData({ role: 'admin' }), 'role')).toEqual({
      ok: false,
      error: 'حقل غير صالح',
    })
  })

  it('updates the admin phone and logs the activity', async () => {
    await loginAsAdmin()

    const result = await updateAdminPhone(formData({ phone: '0551234567' }))
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.phone).toBe('0551234567')
    expect(after.activityLog?.[0]).toMatchObject({
      action: 'profile_updated',
      metadata: 'phone',
    })
  })
})

describe('updateAdminNotificationPreferences', () => {
  it('rejects an anonymous caller', async () => {
    expect(await updateAdminNotificationPreferences({})).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('persists the admin preferences and leaves member toggles alone', async () => {
    await loginAsAdmin()

    const result = await updateAdminNotificationPreferences({
      loanRequests: false,
      newReviews: false,
    })
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.notificationPreferences).toEqual({
      loanRequests: false,
      accountRequests: true,
      loanExtensions: true,
      overdueReturns: true,
      newReviews: false,
      activityLogEvents: true,
      loanReturnReminder: true,
      activityRegistrations: true,
      bulkEmailDigest: false,
    })
  })

  it('defaults unspecified preferences to enabled', async () => {
    await loginAsAdmin()

    const result = await updateAdminNotificationPreferences({ accountRequests: false })
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.notificationPreferences).toEqual({
      loanRequests: true,
      accountRequests: false,
      loanExtensions: true,
      overdueReturns: true,
      newReviews: true,
      activityLogEvents: true,
      loanReturnReminder: true,
      activityRegistrations: true,
      bulkEmailDigest: false,
    })
  })
})

describe('changeAdminPassword', () => {
  it('rejects an anonymous caller', async () => {
    const result = await changeAdminPassword(formData({}))
    expect(result).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('rejects a wrong current password', async () => {
    await loginAsAdmin()

    const result = await changeAdminPassword(
      formData({
        currentPassword: 'wrong-current',
        newPassword: 'new-password-1',
        confirmPassword: 'new-password-1',
      }),
    )
    expect(result).toEqual({ ok: false, error: 'كلمة المرور الحالية غير صحيحة' })
  })

  it('rejects a mismatched confirmation', async () => {
    await loginAsAdmin()

    const result = await changeAdminPassword(
      formData({
        currentPassword: 'correct horse battery',
        newPassword: 'new-password-1',
        confirmPassword: 'different',
      }),
    )
    expect(result).toEqual({ ok: false, error: 'تأكيد كلمة المرور غير متطابق' })
  })

  it('rejects a too-short new password', async () => {
    await loginAsAdmin()

    expect(await updateAdminPassword('short')).toEqual({
      ok: false,
      error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل',
    })

    const result = await changeAdminPassword(
      formData({
        currentPassword: 'correct horse battery',
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    )
    expect(result).toEqual({
      ok: false,
      error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل',
    })
  })

  it('revokes every session on success and leaves exactly one fresh one', async () => {
    // Two live sessions: the change-password device and a stolen one.
    const firstLogin = await loginToken(payload, {
      email: admin.email ?? '',
      password: 'correct horse battery',
    })
    const secondLogin = await loginToken(payload, {
      email: admin.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(secondLogin.token))

    const result = await changeAdminPassword(
      formData({
        currentPassword: 'correct horse battery',
        newPassword: 'brand-new-password',
        confirmPassword: 'brand-new-password',
      }),
    )
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.sessions).toHaveLength(1)

    // The fresh token works, the stolen ones do not, and the new password logs in.
    const fresh = await payload.auth({
      headers: new Headers({
        cookie: `payload-token=${getLastSetCookieOptions('payload-token')?.value}`,
        origin: 'http://localhost:3000',
      }),
    })
    expect(fresh.user?.id).toBe(admin.id)

    for (const stale of [firstLogin.token, secondLogin.token]) {
      const stolen = await payload.auth({
        headers: new Headers({ cookie: `payload-token=${stale}`, origin: 'http://localhost:3000' }),
      })
      expect(stolen.user).toBeNull()
    }

    const newPasswordLogin = await payload.login({
      collection: 'users',
      data: { email: admin.email, password: 'brand-new-password' },
    })
    expect(newPasswordLogin.token).toBeTruthy()
  })
})

describe('admin security session management', () => {
  it('preserves intentional administrative bulk writes without an authenticated caller', async () => {
    const member = await createTestUser(payload, { role: 'user' })
    clearNextContext()
    const result = await payload.update({
      collection: 'users',
      where: {},
      data: { phone: '0551234567' },
      overrideAccess: true,
    })
    expect(result.docs).toHaveLength(2)
    expect(result.docs.map((user) => user.id).sort()).toEqual([admin.id, member.id].sort())
    expect(result.docs.every((user) => user.phone === '0551234567')).toBe(true)
  })
  for (const memberCaller of [false, true]) {
    it(`does not lock another account for a ${memberCaller ? 'member' : 'visitor'} bulk request`, async () => {
      const member = memberCaller ? await createTestUser(payload, { role: 'user' }) : undefined
      const req = await createLocalReq({ user: member }, payload)
      let reached!: () => void
      let release!: () => void
      const locked = new Promise<void>((resolve) => {
        reached = resolve
      })
      const resume = new Promise<void>((resolve) => {
        release = resolve
      })
      const held = withAccountLock(payload, admin.id, async () => {
        reached()
        await resume
      })
      await locked
      const attempt = payload
        .update({
          collection: 'users',
          where: {},
          data: { fullName: 'اسمي فقط' },
          req,
          overrideAccess: false,
        })
        .then(
          (result) => memberCaller && result.docs.length === 1 && result.docs[0].id === member!.id,
          (error: { status?: number }) => !memberCaller && error.status === 403,
        )
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const finished = await Promise.race([
          attempt,
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), 2_000)
          }),
        ])
        expect(finished).toBe(true)
      } finally {
        clearTimeout(timer)
        release()
        await held
        await attempt
      }
    })
  }
  for (const bulk of [false, true]) {
    it(`does not let a delayed ${bulk ? 'bulk' : 'single'} profile write restore an old password or revoked session`, async () => {
      if (bulk)
        await createTestUser(payload, { role: 'admin', email: 'other-bulk@settings-int.usthb.dz' })
      const initial = await loginToken(payload, {
        email: admin.email,
        password: 'correct horse battery',
      })
      setNextHeaders(makeAuthHeaders(initial.token))
      const { user } = await payload.auth({ headers: new Headers(makeAuthHeaders(initial.token)) })
      if (!user) throw new Error('Fixture failed to authenticate')
      const req = await createLocalReq({ user }, payload)
      let reached!: () => void
      let release!: () => void
      let captured = false
      const snapshot = new Promise<void>((resolve) => {
        reached = resolve
      })
      const resume = new Promise<void>((resolve) => {
        release = resolve
      })
      async function pause<T>(result: T, queryReq: unknown): Promise<T> {
        if (queryReq === req && !captured) {
          captured = true
          reached()
          await resume
        }
        return result
      }
      if (bulk) {
        const original = payload.db.find.bind(payload.db)
        vi.spyOn(payload.db, 'find').mockImplementation(async (args) => {
          const result = await original(args)
          return args.select ? result : pause(result, args.req)
        })
      } else {
        const original = payload.db.findOne.bind(payload.db)
        vi.spyOn(payload.db, 'findOne').mockImplementation(async (args) =>
          pause(await original(args), args.req),
        )
      }
      const ordinaryWrite = bulk
        ? payload.update({
            collection: 'users',
            where: { role: { equals: 'admin' } },
            data: { fullName: 'اسم محفوظ' },
            req,
            overrideAccess: false,
          })
        : payload.update({
            collection: 'users',
            id: admin.id,
            data: { fullName: 'اسم محفوظ' },
            req,
            overrideAccess: false,
          })
      await snapshot
      let committed = false
      const passwordChange = changeAdminPassword(
        formData({
          currentPassword: 'correct horse battery',
          newPassword: 'serialized-new-password',
          confirmPassword: 'serialized-new-password',
        }),
      ).then((result) => {
        committed = true
        return result
      })
      try {
        // Observe either the unfenced commit (the regression) or a real blocked
        // row lock, then release the forwarded SQL snapshot in either ordering.
        await expect
          .poll(
            async () => {
              const { rows } = await payload.db.pool.query(
                "SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'",
              )
              return committed || rows.length > 0
            },
            { timeout: 10_000 },
          )
          .toBe(true)
      } finally {
        release()
      }
      await ordinaryWrite
      expect(await passwordChange).toEqual({ ok: true })
      expect(
        (await payload.auth({ headers: new Headers(makeAuthHeaders(initial.token)) })).user,
      ).toBeNull()
      await expect(
        payload.login({
          collection: 'users',
          data: { email: admin.email, password: 'correct horse battery' },
        }),
      ).rejects.toThrow()
      expect(
        (
          await payload.login({
            collection: 'users',
            data: { email: admin.email, password: 'serialized-new-password' },
          })
        ).user?.fullName,
      ).toBe('اسم محفوظ')
    })
  }
  it('clears the cookie when revoking the current device', async () => {
    await loginAsAdmin()
    const { beginAdminReauthentication } = await import('@/features/admin/server/security')
    await beginAdminReauthentication('correct horse battery')
    const data = await getAdminSecurityData()
    expect(await revokeAdminSession(data!.currentSessionId!, '')).toEqual({ ok: true })
    expect(getLastSetCookieOptions('payload-token')).toBeUndefined()
  })
  it('cannot resurrect a revoked SID from a delayed native-login database snapshot', async () => {
    const first = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    const second = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(second.token))
    const { beginAdminReauthentication } = await import('@/features/admin/server/security')
    await beginAdminReauthentication('correct horse battery')
    const sid = JSON.parse(Buffer.from(first.token.split('.')[1], 'base64url').toString()).sid
    let release!: () => void
    let reached!: () => void
    const paused = new Promise<void>((resolve) => {
      reached = resolve
    })
    const resume = new Promise<void>((resolve) => {
      release = resolve
    })
    const original = payload.db.findOne.bind(payload.db)
    // Forward every real SQL read; delay only delivery of native login's
    // password/session snapshot, reproducing the concurrent-writer pattern.
    vi.spyOn(payload.db, 'findOne').mockImplementation(async (args) => {
      const result = await original(args)
      if (args.collection === 'users' && args.where && 'email' in args.where) {
        reached()
        await resume
      }
      return result
    })
    const pending = payload
      .login({
        collection: 'users',
        data: { email: admin.email, password: 'correct horse battery' },
      })
      .then(
        () => true,
        () => false,
      )
    await paused
    try {
      expect(await revokeAdminSession(sid, '')).toEqual({ ok: true })
    } finally {
      release()
    }
    expect(await pending).toBe(false)
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(first.token)) })).user,
    ).toBeNull()
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(second.token)) })).user?.id,
    ).toBe(admin.id)
  })
  it('uses recent identity proof to revoke only the selected device without another password prompt', async () => {
    const first = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    const second = await loginToken(payload, {
      email: admin.email,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(second.token))
    const { beginAdminReauthentication } = await import('@/features/admin/server/security')
    await beginAdminReauthentication('correct horse battery')
    const sid = JSON.parse(Buffer.from(first.token.split('.')[1], 'base64url').toString()).sid
    expect(await revokeAdminSession(sid, '')).toEqual({ ok: true })
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(first.token)) })).user,
    ).toBeNull()
    expect(
      (await payload.auth({ headers: new Headers(makeAuthHeaders(second.token)) })).user?.id,
    ).toBe(admin.id)
  })
  it('lists only this admin’s real sessions and account-log rows', async () => {
    const first = await loginToken(payload, {
      email: admin.email ?? '',
      password: 'correct horse battery',
    })
    await loginToken(payload, {
      email: admin.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(first.token))
    await payload.create({
      collection: 'logs',
      data: {
        actor: admin.id,
        action: 'book_created',
        timestamp: new Date().toISOString(),
        message: 'أضاف كتاباً',
      },
      overrideAccess: true,
    })
    const other = await createTestUser(payload, {
      role: 'admin',
      email: 'other-admin@settings-int.usthb.dz',
      verified: true,
    })
    await payload.create({
      collection: 'logs',
      data: {
        actor: other.id,
        action: 'book_created',
        timestamp: new Date().toISOString(),
        message: 'سجل مشرف آخر',
      },
      overrideAccess: true,
    })

    const data = await getAdminSecurityData()
    expect(data?.user.sessions?.length).toBeGreaterThanOrEqual(2)
    expect(data?.accountLogs).toHaveLength(1)
    expect(typeof data?.accountLogs[0].actor === 'object' && data.accountLogs[0].actor?.id).toBe(
      admin.id,
    )
  })

  it('requires the current password and revokes the selected session immediately', async () => {
    const first = await loginToken(payload, {
      email: admin.email ?? '',
      password: 'correct horse battery',
    })
    const second = await loginToken(payload, {
      email: admin.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(second.token))
    const before = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    const firstSessionId = JSON.parse(
      Buffer.from(first.token.split('.')[1], 'base64url').toString(),
    ).sid
    const targetSession = before.sessions?.find((session) => session.id === firstSessionId)
    expect(targetSession).toBeTruthy()

    await expect(revokeAdminSession(targetSession!.id, 'wrong-password')).resolves.toEqual({
      ok: false,
      error: 'كلمة المرور الحالية غير صحيحة',
    })
    await expect(revokeAdminSession(targetSession!.id, 'correct horse battery')).resolves.toEqual({
      ok: true,
    })

    const after = await payload.findByID({
      collection: 'users',
      id: admin.id,
      overrideAccess: true,
    })
    expect(after.sessions?.some((session) => session.id === targetSession!.id)).toBe(false)
    const revoked = await payload.auth({
      headers: new Headers({
        cookie: `payload-token=${first.token}`,
        origin: 'http://localhost:3000',
      }),
    })
    expect(revoked.user).toBeNull()
  })
})
