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
  updateUserRole,
} = await import('./users')

const user = { id: 9, role: 'admin' }

function context(payload: Record<string, ReturnType<typeof vi.fn>> = {}) {
  getAdminCtx.mockResolvedValue({ payload, user })
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

  it('soft deletes a user and records the action', async () => {
    const update = vi.fn().mockResolvedValue({})
    context({ update })
    await expect(softDeleteUser(4)).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 4,
        data: { deletedAt: expect.any(String) },
        overrideAccess: false,
        user,
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
})
