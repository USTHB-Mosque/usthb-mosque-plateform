import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getPayloadWithUser = vi.fn()

vi.mock('@/shared/lib/auth', () => ({
  getPayloadWithUser: (...args: unknown[]) => getPayloadWithUser(...args),
}))

const { getAdminCtx, getStaffCtx } = await import('./ctx')

const ctx = { payload: {}, user: { role: 'admin' }, req: {} }

describe('features/admin/server/ctx.ts', () => {
  beforeEach(() => {
    getPayloadWithUser.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAdminCtx', () => {
    it('throws when no user is authenticated', async () => {
      getPayloadWithUser.mockResolvedValue(null)

      await expect(getAdminCtx()).rejects.toThrow('Unauthorized')
    })

    it('throws for non-admin users', async () => {
      getPayloadWithUser.mockResolvedValue({ ...ctx, user: { role: 'user' } })

      await expect(getAdminCtx()).rejects.toThrow('Unauthorized')
    })

    it('returns the context for admins', async () => {
      getPayloadWithUser.mockResolvedValue(ctx)

      expect(await getAdminCtx()).toBe(ctx)
      expect(getPayloadWithUser).toHaveBeenCalledWith({ allowAdmin: true })
    })
  })

  describe('getStaffCtx', () => {
    it('throws when no user is authenticated', async () => {
      getPayloadWithUser.mockResolvedValue(null)

      await expect(getStaffCtx()).rejects.toThrow('Unauthorized')
    })

    it('throws for regular users', async () => {
      getPayloadWithUser.mockResolvedValue({ ...ctx, user: { role: 'user' } })

      await expect(getStaffCtx()).rejects.toThrow('Unauthorized')
    })

    it('returns the context for admins', async () => {
      getPayloadWithUser.mockResolvedValue(ctx)

      expect(await getStaffCtx()).toBe(ctx)
    })

    it('returns the context for librarians', async () => {
      const librarianCtx = { ...ctx, user: { role: 'librarian' } }
      getPayloadWithUser.mockResolvedValue(librarianCtx)

      expect(await getStaffCtx()).toBe(librarianCtx)
    })
  })
})
