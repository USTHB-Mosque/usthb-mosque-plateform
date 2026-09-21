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
import {
  changePassword,
  updateNotificationPreferences,
  updateProfileField,
  updateProfileFullName,
} from '@/features/profile/server/settings'
import { getProfileDashboardData } from '@/features/profile/server/dashboard'
import { getLatestUpdates } from '@/features/profile/server/latest-updates'
import type { User } from '@/payload-types'

let payload: Payload
let member: User

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { email: 'profile@usthb.dz', verified: true })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('updateProfileFullName', () => {
  it('rejects an empty full name', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await updateProfileFullName(formData({ fullName: '   ' }))
    expect(result).toEqual({ ok: false, error: 'القيمة مطلوبة' })
  })

  it('rejects an anonymous caller', async () => {
    const result = await updateProfileFullName(formData({ fullName: 'Someone' }))
    expect(result).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('rejects a field outside the allowlist', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await updateProfileField(formData({ role: 'admin' }), 'role')
    expect(result).toEqual({ ok: false, error: 'حقل غير صالح' })
  })

  it('updates the caller full name', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await updateProfileFullName(formData({ fullName: 'الاسم الجديد' }))
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })
    expect(after.fullName).toBe('الاسم الجديد')
  })
})

describe('updateNotificationPreferences', () => {
  it('persists the preferences', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await updateNotificationPreferences({ loanRequests: false })
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })
    expect(after.notificationPreferences).toEqual({
      loanRequests: false,
      activityRegistrations: true,
      loanExtensions: true,
      loanReturnReminder: true,
    })
  })

  it('defaults unspecified preferences to enabled', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await updateNotificationPreferences({})
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })
    expect(after.notificationPreferences).toEqual({
      loanRequests: true,
      activityRegistrations: true,
      loanExtensions: true,
      loanReturnReminder: true,
    })
  })

  it('rejects an anonymous caller', async () => {
    const result = await updateNotificationPreferences({})
    expect(result).toEqual({ ok: false, error: 'غير مصرح' })
  })
})

describe('changePassword', () => {
  it('rejects a wrong current password', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await changePassword(
      formData({
        currentPassword: 'wrong-current',
        newPassword: 'new-password-1',
        confirmPassword: 'new-password-1',
      }),
    )
    expect(result).toEqual({ ok: false, error: 'كلمة المرور الحالية غير صحيحة' })
  })

  it('rejects a mismatched confirmation', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await changePassword(
      formData({
        currentPassword: 'correct horse battery',
        newPassword: 'new-password-1',
        confirmPassword: 'different',
      }),
    )
    expect(result).toEqual({ ok: false, error: 'تأكيد كلمة المرور غير متطابق' })
  })

  it('rejects a too-short new password', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const result = await changePassword(
      formData({
        currentPassword: 'correct horse battery',
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    )
    expect(result).toEqual({ ok: false, error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' })
  })

  it('rejects an anonymous caller', async () => {
    const result = await changePassword(formData({}))
    expect(result).toEqual({ ok: false, error: 'غير مصرح' })
  })

  it('revokes every session on success and leaves exactly one fresh one', async () => {
    // Two live sessions: the change-password device and a stolen one.
    const firstLogin = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    const secondLogin = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(secondLogin.token))

    const result = await changePassword(
      formData({
        currentPassword: 'correct horse battery',
        newPassword: 'brand-new-password',
        confirmPassword: 'brand-new-password',
      }),
    )
    expect(result).toEqual({ ok: true })

    const after = await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })
    expect(after.sessions).toHaveLength(1)

    // The fresh token works, the stolen ones do not.
    const fresh = await payload.auth({
      headers: new Headers({ cookie: `payload-token=${getLastSetCookieOptions('payload-token')?.value}`, origin: 'http://localhost:3000' }),
    })
    expect(fresh.user?.id).toBe(member.id)

    for (const stale of [firstLogin.token, secondLogin.token]) {
      const stolen = await payload.auth({
        headers: new Headers({ cookie: `payload-token=${stale}`, origin: 'http://localhost:3000' }),
      })
      expect(stolen.user).toBeNull()
    }
  })
})

describe('dashboard and latest updates', () => {
  it('returns null for anonymous callers', async () => {
    expect(await getProfileDashboardData()).toBeNull()
    expect(await getLatestUpdates()).toBeNull()
  })

  it('collects the member dashboard data', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const data = await getProfileDashboardData()
    expect(data).not.toBeNull()
    expect(String(data?.user.id)).toBe(String(member.id))
    expect(data?.favorites).toEqual([])
    expect(data?.articleFavorites).toEqual([])
    expect(data?.registrations).toEqual([])
    expect(data?.loans).toEqual([])
  })

  it('collects latest updates for a signed-in member', async () => {
    const { token } = await loginToken(payload, { email: member.email!, password: 'correct horse battery' })
    setNextHeaders(makeAuthHeaders(token))

    const data = await getLatestUpdates()
    expect(data?.articles).toEqual([])
    expect(data?.activities).toEqual([])
    expect(data?.books).toEqual([])
  })
})
