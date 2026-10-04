import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const revalidatePath = vi.fn()
const writeLog = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))

const { getPendingVerifications, approveUser, rejectUser } = await import('./verification')
const user = { id: 8, role: 'admin' }

describe('features/admin/server/verification.ts', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    revalidatePath.mockReset()
    writeLog.mockReset()
  })

  it('lists pending users with access checks and newest first', async () => {
    const docs = [{ id: 3 }]
    const find = vi.fn().mockResolvedValue({ docs })
    getAdminCtx.mockResolvedValue({ payload: { find }, user })
    await expect(getPendingVerifications()).resolves.toBe(docs)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        where: { verificationStatus: { equals: 'pending_verification' } },
        sort: '-createdAt',
        depth: 1,
        overrideAccess: false,
        user,
      }),
    )
  })

  it('approves a user, revalidates related routes, and logs it', async () => {
    const update = vi.fn().mockResolvedValue({})
    getAdminCtx.mockResolvedValue({ payload: { update }, user })
    await expect(approveUser(5)).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 5,
        data: { verificationStatus: 'verified' },
        overrideAccess: false,
        user,
        disableTransaction: true,
      }),
    )
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(writeLog).toHaveBeenCalled()
  })

  it('rejects with the supplied reason', async () => {
    const update = vi.fn().mockResolvedValue({})
    getAdminCtx.mockResolvedValue({ payload: { update }, user })
    await expect(rejectUser(6, 'بيانات ناقصة')).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { verificationStatus: 'rejected', verificationNote: 'بيانات ناقصة' },
      }),
    )
    expect(writeLog).toHaveBeenCalled()
  })

  it('uses the default rejection reason when none is supplied', async () => {
    const update = vi.fn().mockResolvedValue({})
    getAdminCtx.mockResolvedValue({ payload: { update }, user })
    await rejectUser(6)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { verificationStatus: 'rejected', verificationNote: 'تم رفض الطلب' },
      }),
    )
  })
})
