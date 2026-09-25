import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import {
  clearNextContext,
  getLastSetCookieOptions,
  makeAuthHeaders,
  setNextHeaders,
} from '../lib/next-stubs'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import {
  changeAdminPassword,
  getAdminSettingsData,
  updateAdminNotificationPreferences,
  updateAdminPhone,
  updateAdminSettingsField,
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
