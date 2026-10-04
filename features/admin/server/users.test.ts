import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const revalidatePath = vi.fn()
const writeLog = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))

const {
  getAdminUsersStats,
  getAdminUsers,
  softDeleteUser,
  getAdminUser,
  createAdminUser,
  liftBorrowingBlock,
  updateUserRole,
} = await import('./users')

const user = { id: 9, role: 'admin' }
const req = { kind: 'req' }

function context(payloadOverrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  getAdminCtx.mockResolvedValue({ payload: { ...payloadOverrides }, user, req })
}

describe('features/admin/server/users.ts', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    revalidatePath.mockReset()
    writeLog.mockReset()
  })

  it('gets all user count buckets with admin access', async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce({ totalDocs: 10 })
      .mockResolvedValueOnce({ totalDocs: 5 })
      .mockResolvedValueOnce({ totalDocs: 3 })
      .mockResolvedValueOnce({ totalDocs: 2 })
    context({ count })
    await expect(getAdminUsersStats()).resolves.toEqual({
      stats: { totalUsers: 10, activeAccounts: 5, pendingJoinRequests: 3, inactiveAccounts: 2 },
    })
    expect(count).toHaveBeenCalledTimes(4)
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', overrideAccess: false, user }),
    )
  })

  it('builds user filters from role, statuses and search and applies pagination defaults', async () => {
    const result = { docs: [], totalDocs: 0 }
    const find = vi.fn().mockResolvedValue(result)
    context({ find })
    await expect(
      getAdminUsers({
        role: 'librarian',
        verificationStatus: ['verified', 'rejected'],
        search: 'ali',
      }),
    ).resolves.toBe(result)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        page: 1,
        limit: 20,
        sort: '-createdAt',
        depth: 0,
        overrideAccess: false,
        user,
        where: {
          and: [
            { deletedAt: { exists: false } },
            { role: { equals: 'librarian' } },
            { verificationStatus: { in: ['verified', 'rejected'] } },
            {
              or: ['email', 'fullName', 'firstName', 'lastName', 'phone'].map((field) => ({
                [field]: { contains: 'ali' },
              })),
            },
          ],
        },
      }),
    )
  })

  it('uses an unfiltered active user query when optional fields are absent and accepts explicit pagination', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    context({ find })
    await getAdminUsers({ page: 3, limit: 7, role: undefined, verificationStatus: [], search: '' })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        limit: 7,
        where: { and: [{ deletedAt: { exists: false } }] },
      }),
    )
  })

  it('soft deletes a user through the account lifecycle and records the action', async () => {
    // The real lifecycle function runs here: the admin action must stamp the
    // deletion timestamps, drop the sessions and clear the media pointers,
    // not just flip `deletedAt`.
    const findByID = vi
      .fn()
      .mockResolvedValue({ id: 4, verificationDocument: null, profilePicture: null })
    const update = vi.fn().mockResolvedValue({ id: 4 })
    context({ findByID, update })

    await expect(softDeleteUser(4)).resolves.toEqual({ ok: true })

    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', id: 4, overrideAccess: true, req }),
    )
    // First the deletion timestamps, then the emptied session list.
    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'users',
        id: 4,
        data: {
          deletedAt: expect.any(String),
          deletionScheduledFor: expect.any(String),
        },
        overrideAccess: true,
        req,
      }),
    )
    expect(update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'users',
        id: 4,
        data: { sessions: [] },
        overrideAccess: true,
        req,
      }),
    )
    expect(writeLog).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/users')
  })

  it('gets an individual user with relationships populated', async () => {
    const doc = { id: 4 }
    const findByID = vi.fn().mockResolvedValue(doc)
    context({ findByID })
    await expect(getAdminUser('4')).resolves.toBe(doc)
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: '4',
        depth: 2,
        overrideAccess: false,
        user,
      }),
    )
  })

  it('creates an admin user and omits a missing full name', async () => {
    const create = vi.fn().mockResolvedValue({ id: 12 })
    context({ create })
    await expect(
      createAdminUser({ email: 'a@example.com', password: 'secret', role: 'admin' }),
    ).resolves.toEqual({ ok: true, userId: 12 })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fullName: undefined, verificationStatus: 'verified' }),
        overrideAccess: false,
        user,
      }),
    )
    expect(writeLog).toHaveBeenCalled()
  })

  it('creates a librarian with a full name and maps duplicate errors', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: 13 })
      .mockRejectedValueOnce(new Error('duplicate email'))
    context({ create })
    await expect(
      createAdminUser({
        fullName: 'Ali',
        email: 'a@example.com',
        password: 'secret',
        role: 'librarian',
      }),
    ).resolves.toEqual({ ok: true, userId: 13 })
    expect(create.mock.calls[0][0].data.fullName).toBe('Ali')
    await expect(
      createAdminUser({ email: 'a@example.com', password: 'secret', role: 'admin' }),
    ).resolves.toEqual({ ok: false, error: 'البريد الإلكتروني مستخدم بالفعل' })
  })

  it('maps non-duplicate and non-Error create failures to a generic message', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('database down'))
      .mockRejectedValueOnce('failure')
    context({ create })
    await expect(
      createAdminUser({ email: 'a@example.com', password: 'secret', role: 'admin' }),
    ).resolves.toEqual({ ok: false, error: 'تعذر إنشاء المستخدم' })
    await expect(
      createAdminUser({ email: 'a@example.com', password: 'secret', role: 'admin' }),
    ).resolves.toEqual({ ok: false, error: 'تعذر إنشاء المستخدم' })
  })

  it('updates the role and handles success and both error forms', async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('denied'))
      .mockRejectedValueOnce('failed')
    context({ update })
    await expect(updateUserRole(4, 'librarian')).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 4,
        data: { role: 'librarian' },
        overrideAccess: false,
        user,
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/users/4')
    await expect(updateUserRole(4, 'user')).resolves.toEqual({ ok: false, error: 'denied' })
    await expect(updateUserRole(4, 'admin')).resolves.toEqual({
      ok: false,
      error: 'تعذر تحديث الدور',
    })
  })

  describe('liftBorrowingBlock (D2)', () => {
    it('clears the block, steps the counter back one and logs it', async () => {
      const findByID = vi
        .fn()
        .mockResolvedValue({ id: 4, borrowingBlockedAt: '2026-10-01', noShowCount: 2 })
      const update = vi.fn().mockResolvedValue({})
      context({ findByID, update })

      await expect(liftBorrowingBlock(4)).resolves.toEqual({ ok: true })

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          id: 4,
          data: { borrowingBlockedAt: null, noShowCount: 1 },
          overrideAccess: false,
          user,
          req,
        }),
      )
      expect(writeLog).toHaveBeenCalledWith(
        expect.anything(),
        user,
        expect.objectContaining({
          action: 'user_block_lifted',
          targetType: 'user',
          targetId: 4,
          metadata: { noShowCount: 1 },
        }),
      )
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/users')
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/users/4')
    })

    it('refuses when there is no block to lift', async () => {
      const findByID = vi
        .fn()
        .mockResolvedValue({ id: 4, borrowingBlockedAt: null, noShowCount: 0 })
      const update = vi.fn()
      context({ findByID, update })

      await expect(liftBorrowingBlock(4)).resolves.toEqual({
        ok: false,
        error: 'لا يوجد حجب إعارة مفتوح على هذا العضو',
      })
      expect(update).not.toHaveBeenCalled()
      expect(writeLog).not.toHaveBeenCalled()
    })

    it('reads a counter stored as null as zero', async () => {
      const findByID = vi
        .fn()
        .mockResolvedValue({ id: 4, borrowingBlockedAt: 'x', noShowCount: null })
      const update = vi.fn().mockResolvedValue({})
      context({ findByID, update })

      await expect(liftBorrowingBlock(4)).resolves.toEqual({ ok: true })
      expect(update.mock.calls[0][0].data.noShowCount).toBe(0)
    })

    it('never takes the counter below zero', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 4, borrowingBlockedAt: 'x', noShowCount: 0 })
      const update = vi.fn().mockResolvedValue({})
      context({ findByID, update })

      await expect(liftBorrowingBlock(4)).resolves.toEqual({ ok: true })
      expect(update.mock.calls[0][0].data.noShowCount).toBe(0)
    })

    it('reports a lookup failure and a failure that is not an Error', async () => {
      context({ findByID: vi.fn().mockRejectedValue(new Error('Unauthorized')) })
      await expect(liftBorrowingBlock(4)).resolves.toEqual({ ok: false, error: 'Unauthorized' })

      context({ findByID: vi.fn().mockRejectedValue('boom') })
      await expect(liftBorrowingBlock(4)).resolves.toEqual({ ok: false, error: 'تعذر رفع الحجب' })
    })
  })
})
