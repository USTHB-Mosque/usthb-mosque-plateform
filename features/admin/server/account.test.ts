import { describe, expect, it, vi, beforeEach } from 'vitest'

const getPayloadWithUser = vi.fn()
const getAdminLogs = vi.fn()

vi.mock('@/shared/lib/auth', () => ({
  getPayloadWithUser: (...args: unknown[]) => getPayloadWithUser(...args),
}))
vi.mock('./logs', () => ({ getAdminLogs: (...args: unknown[]) => getAdminLogs(...args) }))

const {
  getAdminUser,
  getAdminSettingsData,
  getAdminSecurityData,
  updateAdminProfile,
  updateAdminPassword,
  revokeAdminSession,
} = await import('./account')

describe('features/admin/server/account.ts', () => {
  beforeEach(() => {
    getPayloadWithUser.mockReset()
    getAdminLogs.mockReset()
  })

  describe('getAdminUser', () => {
    it('returns null when there is no authenticated user', async () => {
      getPayloadWithUser.mockResolvedValue(null)

      expect(await getAdminUser()).toBeNull()
    })

    it('returns null for non-admin users', async () => {
      getPayloadWithUser.mockResolvedValue({ user: { role: 'user' } })

      expect(await getAdminUser()).toBeNull()
    })

    it('returns the context for admin users', async () => {
      const ctx = { user: { role: 'admin' }, payload: {}, req: {} }
      getPayloadWithUser.mockResolvedValue(ctx)

      expect(await getAdminUser()).toBe(ctx)
    })
  })

  describe('updateAdminProfile', () => {
    it('rejects when there is no authenticated admin', async () => {
      getPayloadWithUser.mockResolvedValue(null)

      expect(await updateAdminProfile('name')).toEqual({ ok: false, error: 'غير مصرح' })
    })

    it('updates fullName on the users collection', async () => {
      const update = vi.fn().mockResolvedValue({})
      getPayloadWithUser.mockResolvedValue({
        user: { id: 7, role: 'admin' },
        payload: { update },
        req: { headers: new Headers() },
      })

      const result = await updateAdminProfile('الاسم الجديد')

      expect(result).toEqual({ ok: true })
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          id: 7,
          data: { fullName: 'الاسم الجديد' },
          overrideAccess: false,
        }),
      )
    })

    it('returns the error message when the update fails', async () => {
      getPayloadWithUser.mockResolvedValue({
        user: { id: 7, role: 'admin' },
        payload: { update: vi.fn().mockRejectedValue(new Error('db down')) },
        req: {},
      })

      expect(await updateAdminProfile('x')).toEqual({ ok: false, error: 'db down' })
    })

    it('falls back to a generic Arabic message for non-Error failures', async () => {
      getPayloadWithUser.mockResolvedValue({
        user: { id: 7, role: 'admin' },
        payload: { update: vi.fn().mockRejectedValue('not-an-error') },
        req: {},
      })

      expect(await updateAdminProfile('x')).toEqual({ ok: false, error: 'حدث خطأ' })
    })
  })

  describe('admin settings data', () => {
    it('returns null without an admin and retrieves the admin profile', async () => {
      getPayloadWithUser.mockResolvedValue(null)
      await expect(getAdminSettingsData()).resolves.toBeNull()
      const user = { id: 7, role: 'admin', fullName: 'Admin' }
      const findByID = vi.fn().mockResolvedValue(user)
      getPayloadWithUser.mockResolvedValue({ user, payload: { findByID }, req: {} })
      await expect(getAdminSettingsData()).resolves.toEqual({ user })
      expect(findByID).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'users', id: 7, depth: 2, overrideAccess: false }),
      )
    })

    it('returns null without an admin and account security data without a session id', async () => {
      getPayloadWithUser.mockResolvedValue(null)
      await expect(getAdminSecurityData()).resolves.toBeNull()
      const user = { id: 7, role: 'admin' }
      const findByID = vi.fn().mockResolvedValue({ id: 7, sessions: [] })
      getPayloadWithUser.mockResolvedValue({ user, payload: { findByID }, req: {} })
      getAdminLogs.mockResolvedValue({ logs: [{ id: 1 }] })
      await expect(getAdminSecurityData()).resolves.toEqual({
        user: { id: 7, sessions: [] },
        accountLogs: [{ id: 1 }],
        currentSessionId: null,
      })
    })
  })

  describe('updateAdminPassword', () => {
    it('rejects when there is no authenticated admin', async () => {
      getPayloadWithUser.mockResolvedValue(null)

      expect(await updateAdminPassword('secret')).toEqual({ ok: false, error: 'غير مصرح' })
    })

    it('updates password on the users collection', async () => {
      const update = vi.fn().mockResolvedValue({})
      getPayloadWithUser.mockResolvedValue({
        user: { id: 7, role: 'admin' },
        payload: { update },
        req: {},
      })

      const result = await updateAdminPassword('secret')

      expect(result).toEqual({ ok: true })
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          id: 7,
          data: { password: 'secret' },
          overrideAccess: false,
        }),
      )
    })
  })

  describe('revokeAdminSession', () => {
    it('refuses to revoke when there is no active admin session', async () => {
      getPayloadWithUser.mockResolvedValue(null)
      await expect(revokeAdminSession('session', 'secret')).resolves.toEqual({
        ok: false,
        error: 'غير مصرح',
      })
    })

    it('requires a session id and current password', async () => {
      getPayloadWithUser.mockResolvedValue({
        user: { id: 7, role: 'admin' },
        payload: {},
        req: {},
      })
      await expect(revokeAdminSession('', 'secret')).resolves.toEqual({
        ok: false,
        error: 'أدخل كلمة المرور الحالية',
      })
      await expect(revokeAdminSession('session', '')).resolves.toEqual({
        ok: false,
        error: 'أدخل كلمة المرور الحالية',
      })
    })

    it('reports when the requested session is no longer active', async () => {
      const findByID = vi.fn().mockResolvedValue({})
      getPayloadWithUser.mockResolvedValue({
        user: { id: 7, role: 'admin' },
        payload: { findByID },
        req: {},
      })
      await expect(revokeAdminSession('gone', 'secret')).resolves.toEqual({
        ok: false,
        error: 'الجهاز غير موجود أو تم تسجيل خروجه',
      })
    })
  })
})
