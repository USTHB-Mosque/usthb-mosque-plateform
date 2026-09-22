import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Payload } from 'payload'

const logActivity = vi.fn()

vi.mock('@/utils/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}))

const fakePayload = {
  find: vi.fn(),
  create: vi.fn(),
}

const payload = fakePayload as unknown as Payload

const { createFirstAdmin } = await import('./first-admin-core')

describe('features/admin/server/first-admin-core.ts', () => {
  beforeEach(() => {
    fakePayload.find.mockReset()
    fakePayload.create.mockReset()
    logActivity.mockReset()
  })

  it('returns users-exist without creating when users already exist', async () => {
    fakePayload.find.mockResolvedValue({ totalDocs: 2 })

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({ kind: 'users-exist' })
    expect(fakePayload.create).not.toHaveBeenCalled()
    expect(logActivity).not.toHaveBeenCalled()
  })

  it('creates an admin and logs first_admin_created on an empty collection', async () => {
    fakePayload.find.mockResolvedValue({ totalDocs: 0 })
    fakePayload.create.mockResolvedValue({ id: 7 })

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({
      kind: 'created',
      userId: 7,
    })
    expect(fakePayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        draft: false,
        data: { email: 'a@b.c', password: 'secret', role: 'admin' },
      }),
    )
    expect(logActivity).toHaveBeenCalledWith(payload, 7, 'first_admin_created')
  })

  it('still reports created when activity logging fails', async () => {
    fakePayload.find.mockResolvedValue({ totalDocs: 0 })
    fakePayload.create.mockResolvedValue({ id: 7 })
    logActivity.mockRejectedValue(new Error('log write failed'))

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({
      kind: 'created',
      userId: 7,
    })
  })

  it('maps duplicate-email errors to a friendly Arabic message', async () => {
    fakePayload.find.mockResolvedValue({ totalDocs: 0 })
    fakePayload.create.mockRejectedValue(new Error('duplicate key value violates constraint'))

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({
      kind: 'error',
      message: 'البريد الإلكتروني مستخدم بالفعل',
    })
  })

  it('returns the raw error message for other create failures', async () => {
    fakePayload.find.mockResolvedValue({ totalDocs: 0 })
    fakePayload.create.mockRejectedValue(new Error('boom'))

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({
      kind: 'error',
      message: 'boom',
    })
  })

  it('maps the find failure through the same error outcome', async () => {
    fakePayload.find.mockRejectedValue(new Error('db down'))

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({
      kind: 'error',
      message: 'db down',
    })
  })

  it('falls back to a generic Arabic message for non-Error failures', async () => {
    fakePayload.find.mockResolvedValue({ totalDocs: 0 })
    fakePayload.create.mockRejectedValue('not-an-error')

    expect(await createFirstAdmin(payload, 'a@b.c', 'secret')).toEqual({
      kind: 'error',
      message: 'حدث خطأ',
    })
  })
})
