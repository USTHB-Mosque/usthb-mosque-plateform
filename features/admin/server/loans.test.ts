import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
const getAdminCtx = vi.fn()
const acceptLoanLogic = vi.fn()
const acceptLoan = vi.fn()
const refuseLoan = vi.fn()
const markLoanReturned = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  revalidateTag: vi.fn(),
}))

vi.mock('@/features/admin/server/ctx', () => ({
  getAdminCtx: (...args: unknown[]) => getAdminCtx(...args),
}))

vi.mock('@/features/library', () => ({
  acceptLoanLogic: (...args: unknown[]) => acceptLoanLogic(...args),
  acceptLoan: (...args: unknown[]) => acceptLoan(...args),
  refuseLoan: (...args: unknown[]) => refuseLoan(...args),
  markLoanReturned: (...args: unknown[]) => markLoanReturned(...args),
}))

const {
  getAdminLoansStats,
  getLoansByStatus,
  addLoan,
  approveLoan,
  rejectLoan,
  markLoanReturned: adminMarkLoanReturned,
} = await import('./loans')

const adminCtx = (overrides: Record<string, unknown> = {}) => ({
  payload: { count: vi.fn(), findByID: vi.fn(), create: vi.fn(), find: vi.fn(), delete: vi.fn() },
  user: { role: 'admin' },
  req: {},
  ...overrides,
})

describe('features/admin/server/loans.ts', () => {
  beforeEach(() => {
    getAdminCtx.mockReset().mockResolvedValue(adminCtx())
    revalidatePath.mockReset()
    acceptLoanLogic.mockReset()
    acceptLoan.mockReset()
    refuseLoan.mockReset()
    markLoanReturned.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAdminLoansStats', () => {
    it('computes the four admin loan stats', async () => {
      const payload = {
        count: vi
          .fn()
          .mockResolvedValueOnce({ totalDocs: 10 })
          .mockResolvedValueOnce({ totalDocs: 3 })
          .mockResolvedValueOnce({ totalDocs: 2 })
          .mockResolvedValueOnce({ totalDocs: 1 }),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const { stats } = await getAdminLoansStats()

      expect(stats).toEqual({
        totalLoans: 10,
        pendingLoans: 3,
        extensionRequests: 2,
        overdueLoans: 1,
      })
      expect(payload.count).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          collection: 'loans',
          where: {
            and: [
              { status: { in: ['accepted', 'picked_up'] } },
              expect.objectContaining({ dueDate: { less_than: expect.any(String) } }),
            ],
          },
          overrideAccess: false,
        }),
      )
    })
  })

  describe('getLoansByStatus', () => {
    const findResult = {
      docs: [{ id: 1 }, { id: 2 }],
      totalPages: 3,
      totalDocs: 42,
    }

    it('returns the docs, pagination and total for a status', async () => {
      const payload = { find: vi.fn().mockResolvedValue(findResult) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await getLoansByStatus('accepted', 2, 5)

      expect(result).toEqual({
        docs: findResult.docs,
        totalPages: 3,
        totalDocs: 42,
      })
      expect(payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'loans',
          where: { status: { equals: 'accepted' } },
          page: 2,
          limit: 5,
          overrideAccess: false,
        }),
      )
    })

    it('falls back to the default page and limit', async () => {
      const payload = { find: vi.fn().mockResolvedValue(findResult) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await getLoansByStatus('pending')

      expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }))
    })
  })

  describe('addLoan', () => {
    it('creates a pending loan and accepts it, reserving the copy', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({ id: 11, availableBooks: 2 }),
        create: vi.fn().mockResolvedValue({ id: 55 }),
        delete: vi.fn().mockResolvedValue({}),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))
      acceptLoanLogic.mockResolvedValue({ success: true, loanId: 55 })

      const result = await addLoan(11, 7)

      expect(result).toEqual({ ok: true, loanId: 55 })
      expect(payload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'loans',
          data: expect.objectContaining({
            book: 11,
            user: 7,
            status: 'pending',
            loanDate: expect.any(String),
          }),
          overrideAccess: false,
        }),
      )
      expect(acceptLoanLogic).toHaveBeenCalledWith(55, expect.anything())
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/loans')
    })

    it('returns an error when the book does not exist', async () => {
      const payload = {
        findByID: vi.fn().mockRejectedValue(new Error('not found')),
        create: vi.fn(),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await addLoan(999, 7)

      expect(result).toEqual({ ok: false, error: 'الكتاب غير موجود' })
      expect(payload.create).not.toHaveBeenCalled()
    })

    it('rejects when no copies are available', async () => {
      const payload = { findByID: vi.fn().mockResolvedValue({ id: 11, availableBooks: 0 }) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await addLoan(11, 7)

      expect(result).toEqual({ ok: false, error: 'لا توجد نسخ متاحة حالياً' })
    })

    it('treats a missing availability count as zero copies', async () => {
      const payload = { findByID: vi.fn().mockResolvedValue({ id: 11 }) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await addLoan(11, 7)

      expect(result).toEqual({ ok: false, error: 'لا توجد نسخ متاحة حالياً' })
    })

    it('rolls the loan back and returns the error when the accept fails', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({ id: 11, availableBooks: 2 }),
        create: vi.fn().mockResolvedValue({ id: 55 }),
        delete: vi.fn().mockResolvedValue({}),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))
      acceptLoanLogic.mockResolvedValue({ success: false, message: 'حدث خطأ' })

      const result = await addLoan(11, 7)

      expect(result).toEqual({ ok: false, error: 'حدث خطأ' })
      expect(payload.delete).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'loans', id: 55 }),
      )
    })
  })

  describe('approveLoan', () => {
    it('accepts a pending loan', async () => {
      acceptLoan.mockResolvedValue({ success: true })

      const result = await approveLoan(5)

      expect(result).toEqual({ ok: true })
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/loans')
    })

    it('returns the failure message', async () => {
      acceptLoan.mockResolvedValue({ success: false, message: 'غير مصرح' })

      const result = await approveLoan(5)

      expect(result).toEqual({ ok: false, error: 'غير مصرح' })
    })
  })

  describe('rejectLoan', () => {
    it('uses the provided reason', async () => {
      refuseLoan.mockResolvedValue({ success: true })

      const result = await rejectLoan(5, 'النسخة تالفة')

      expect(result).toEqual({ ok: true })
      expect(refuseLoan).toHaveBeenCalledWith(5, 'النسخة تالفة')
    })

    it('falls back to the default reason', async () => {
      refuseLoan.mockResolvedValue({ success: true })

      const result = await rejectLoan(5)

      expect(result).toEqual({ ok: true })
      expect(refuseLoan).toHaveBeenCalledWith(5, 'رفض الطلب من قبل الإدارة')
    })

    it('returns the failure message', async () => {
      refuseLoan.mockResolvedValue({ success: false, message: 'يجب إدخال سبب الرفض' })

      const result = await rejectLoan(5, '')

      expect(result).toEqual({ ok: false, error: 'يجب إدخال سبب الرفض' })
    })
  })

  describe('markLoanReturned', () => {
    it('marks a picked-up loan as returned', async () => {
      markLoanReturned.mockResolvedValue({ success: true })

      const result = await adminMarkLoanReturned(5)

      expect(result).toEqual({ ok: true })
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/loans')
    })

    it('returns the failure message', async () => {
      markLoanReturned.mockResolvedValue({
        success: false,
        message: 'لا يمكن إرجاع إعارة لم تؤخذ بعد',
      })

      const result = await adminMarkLoanReturned(5)

      expect(result).toEqual({ ok: false, error: 'لا يمكن إرجاع إعارة لم تؤخذ بعد' })
    })
  })
})
