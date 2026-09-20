import { describe, expect, it, vi, beforeEach } from 'vitest'

const fakePayload = {
  find: vi.fn(),
  create: vi.fn(),
  login: vi.fn(),
}

const getPayload = vi.fn(async (..._args: unknown[]) => fakePayload)
const setPayloadTokenCookie = vi.fn()

vi.mock('payload', () => ({
  getPayload: (...args: unknown[]) => getPayload(...args),
}))

vi.mock('@/payload.config', () => ({ default: {} }))

vi.mock('@/shared/lib/auth', () => ({
  setPayloadTokenCookie: (...args: unknown[]) => setPayloadTokenCookie(...args),
}))

const { hasAnyUser, createFirstAdminUser } = await import('./create-first-user')

describe('features/admin/server/create-first-user.ts', () => {
  beforeEach(() => {
    fakePayload.find.mockReset()
    fakePayload.create.mockReset()
    fakePayload.login.mockReset()
    setPayloadTokenCookie.mockReset()
  })

  describe('hasAnyUser', () => {
    it('returns true when at least one user exists', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 1 })

      expect(await hasAnyUser()).toBe(true)
    })

    it('returns false when the users collection is empty', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 0 })

      expect(await hasAnyUser()).toBe(false)
    })

    it('fails closed to true when the DB check fails', async () => {
      fakePayload.find.mockRejectedValue(new Error('db down'))

      expect(await hasAnyUser()).toBe(true)
    })
  })

  describe('createFirstAdminUser', () => {
    it('refuses to create when users already exist', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 2 })

      expect(await createFirstAdminUser('a@b.c', 'secret')).toEqual({
        ok: false,
        error: 'المستخدمون موجودون بالفعل',
      })
      expect(fakePayload.create).not.toHaveBeenCalled()
    })

    it('creates the admin user and sets the token cookie', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 0 })
      fakePayload.create.mockResolvedValue({ id: 1 })
      fakePayload.login.mockResolvedValue({ token: 'jwt-token' })

      expect(await createFirstAdminUser('a@b.c', 'secret')).toEqual({ ok: true })
      expect(fakePayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          data: { email: 'a@b.c', password: 'secret', role: 'admin' },
        }),
      )
      expect(setPayloadTokenCookie).toHaveBeenCalledWith('jwt-token')
    })

    it('does not set a cookie when login returns no token', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 0 })
      fakePayload.create.mockResolvedValue({ id: 1 })
      fakePayload.login.mockResolvedValue({ token: null })

      expect(await createFirstAdminUser('a@b.c', 'secret')).toEqual({ ok: true })
      expect(setPayloadTokenCookie).not.toHaveBeenCalled()
    })

    it('maps duplicate errors to a friendly Arabic message', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 0 })
      fakePayload.create.mockRejectedValue(new Error('duplicate key value violates constraint'))

      expect(await createFirstAdminUser('a@b.c', 'secret')).toEqual({
        ok: false,
        error: 'البريد الإلكتروني مستخدم بالفعل',
      })
    })

    it('returns the raw error message for other failures', async () => {
      fakePayload.find.mockResolvedValue({ totalDocs: 0 })
      fakePayload.create.mockRejectedValue(new Error('boom'))

      expect(await createFirstAdminUser('a@b.c', 'secret')).toEqual({ ok: false, error: 'boom' })
    })
  })
})
