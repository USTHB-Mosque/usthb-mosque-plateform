import { describe, expect, it, vi, beforeEach } from 'vitest'

const getPayloadWithUser = vi.fn()

vi.mock('@/shared/lib/auth', () => ({
  getPayloadWithUser: (...args: unknown[]) => getPayloadWithUser(...args),
}))

const { getAdminUser, updateAdminProfile, updateAdminPassword } = await import('./account')

describe('features/admin/server/account.ts', () => {
  beforeEach(() => {
    getPayloadWithUser.mockReset()
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
})
