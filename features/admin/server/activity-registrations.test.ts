import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()

vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('./logs', () => ({ writeLog: vi.fn() }))
vi.mock('@/features/activities', () => ({ completeFinishedRegistrations: vi.fn() }))

const { markActivityAttendance } = await import('./activity-registrations')

describe('markActivityAttendance without a recorded status', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
  })

  it('refuses to record attendance for a registration with no status', async () => {
    const findByID = vi.fn().mockResolvedValue({ id: 1, activity: 3, status: null })
    getAdminCtx.mockResolvedValue({
      payload: { findByID },
      user: { id: 2, role: 'admin' },
      req: {},
    })

    expect(await markActivityAttendance(1, true)).toEqual({
      ok: false,
      error: 'لا يمكن تسجيل الحضور لهذا التسجيل',
    })
  })
})
