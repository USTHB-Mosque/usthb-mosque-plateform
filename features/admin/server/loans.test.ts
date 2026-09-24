import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatArabicDate } from '@/shared/lib/dates'

const revalidatePath = vi.fn()
const getAdminCtx = vi.fn()
const acceptLoanLogic = vi.fn()
const acceptLoan = vi.fn()
const refuseLoan = vi.fn()
const markLoanReturned = vi.fn()
const markLoanPickedUp = vi.fn()
const createNotification = vi.fn()

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
  markLoanPickedUp: (...args: unknown[]) => markLoanPickedUp(...args),
}))

vi.mock('@/features/notifications', () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
}))

const {
  getAdminLoansStats,
  getLoansByStatus,
  addLoan,
  approveLoan,
  rejectLoan,
  markLoanReturned: adminMarkLoanReturned,
  markLoanPickedUp: adminMarkLoanPickedUp,
  sendLoanReminder,
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
    markLoanPickedUp.mockReset()
    createNotification.mockReset()
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

      const result = await getLoansByStatus('accepted', { page: 2, limit: 5 })

      expect(result).toEqual({
        docs: findResult.docs,
        totalPages: 3,
        totalDocs: 42,
      })
      expect(payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'loans',
          where: { and: [{ status: { equals: 'accepted' } }] },
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

    it('filters by overdue due dates', async () => {
      const payload = { find: vi.fn().mockResolvedValue(findResult) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await getLoansByStatus('picked_up', { overdue: 'overdue' })
      expect(payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            and: [
              { status: { equals: 'picked_up' } },
              { dueDate: { less_than: expect.any(String) } },
            ],
          },
        }),
      )

      await getLoansByStatus('picked_up', { overdue: 'not-overdue' })
      expect(payload.find).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            and: [
              { status: { equals: 'picked_up' } },
              { dueDate: { greater_than: expect.any(String) } },
            ],
          },
        }),
      )
    })

    it('resolves a search to matching user and book ids', async () => {
      const payload = {
        find: vi
          .fn()
          .mockResolvedValueOnce({ docs: [{ id: 3 }], totalDocs: 1, totalPages: 1 })
          .mockResolvedValueOnce({ docs: [{ id: 11 }], totalDocs: 1, totalPages: 1 })
          .mockResolvedValueOnce(findResult),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await getLoansByStatus('pending', { search: 'science' })

      expect(payload.find).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ collection: 'users' }),
      )
      expect(payload.find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ collection: 'books' }),
      )
      expect(payload.find).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          collection: 'loans',
          where: {
            and: [
              { status: { equals: 'pending' } },
              { or: [{ 'user.id': { in: [3] } }, { book: { in: [11] } }] },
            ],
          },
        }),
      )
    })

    it('builds the search filter from a user match only', async () => {
      const payload = {
        find: vi
          .fn()
          .mockResolvedValueOnce({ docs: [{ id: 3 }], totalDocs: 1, totalPages: 1 })
          .mockResolvedValueOnce({ docs: [], totalDocs: 0, totalPages: 1 })
          .mockResolvedValueOnce(findResult),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await getLoansByStatus('pending', { search: 'yacine' })

      expect(payload.find).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: {
            and: [{ status: { equals: 'pending' } }, { or: [{ 'user.id': { in: [3] } }] }],
          },
        }),
      )
    })

    it('builds the search filter from a book match only', async () => {
      const payload = {
        find: vi
          .fn()
          .mockResolvedValueOnce({ docs: [], totalDocs: 0, totalPages: 1 })
          .mockResolvedValueOnce({ docs: [{ id: 11 }], totalDocs: 1, totalPages: 1 })
          .mockResolvedValueOnce(findResult),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await getLoansByStatus('pending', { search: 'physics' })

      expect(payload.find).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: { and: [{ status: { equals: 'pending' } }, { or: [{ book: { in: [11] } }] }] },
        }),
      )
    })

    it('returns nothing when the search matches no user or book', async () => {
      const payload = {
        find: vi
          .fn()
          .mockResolvedValueOnce({ docs: [], totalDocs: 0, totalPages: 1 })
          .mockResolvedValueOnce({ docs: [], totalDocs: 0, totalPages: 1 })
          .mockResolvedValueOnce(findResult),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await getLoansByStatus('pending', { search: 'zzz' })

      expect(payload.find).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: { and: [{ status: { equals: 'pending' } }, { id: { equals: -1 } }] },
        }),
      )
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

    it('passes pickup and due dates to the created loan', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({ id: 11, availableBooks: 2 }),
        create: vi.fn().mockResolvedValue({ id: 55 }),
        delete: vi.fn().mockResolvedValue({}),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))
      acceptLoanLogic.mockResolvedValue({ success: true, loanId: 55 })

      const result = await addLoan(11, 7, {
        pickupDate: '2026-10-01T09:00:00.000Z',
        dueDate: '2026-10-15T09:00:00.000Z',
      })

      expect(result).toEqual({ ok: true, loanId: 55 })
      expect(payload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'loans',
          data: expect.objectContaining({
            pickupDate: '2026-10-01T09:00:00.000Z',
            dueDate: '2026-10-15T09:00:00.000Z',
          }),
          overrideAccess: false,
        }),
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

  describe('markLoanPickedUp', () => {
    it('marks an accepted loan as picked up', async () => {
      markLoanPickedUp.mockResolvedValue({ success: true })

      const result = await adminMarkLoanPickedUp(5)

      expect(result).toEqual({ ok: true })
      expect(markLoanPickedUp).toHaveBeenCalledWith(5)
      expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/loans')
    })

    it('returns the failure message', async () => {
      markLoanPickedUp.mockResolvedValue({
        success: false,
        message: 'لا يمكن تسجيل أخذ كتاب لطلب غير مقبول',
      })

      const result = await adminMarkLoanPickedUp(5)

      expect(result).toEqual({ ok: false, error: 'لا يمكن تسجيل أخذ كتاب لطلب غير مقبول' })
    })
  })

  describe('sendLoanReminder', () => {
    const notificationArgs = () => createNotification.mock.calls[0][0]

    it('returns an error when the loan does not exist', async () => {
      const payload = { findByID: vi.fn().mockRejectedValue(new Error('not found')) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await sendLoanReminder(5)

      expect(result).toEqual({ ok: false, error: 'الإعارة غير موجودة' })
      expect(createNotification).not.toHaveBeenCalled()
    })

    it('returns an error when the lookup resolves to nothing', async () => {
      const payload = { findByID: vi.fn().mockResolvedValue(undefined) }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await sendLoanReminder(5)

      expect(result).toEqual({ ok: false, error: 'الإعارة غير موجودة' })
      expect(createNotification).not.toHaveBeenCalled()
    })

    it('sends a pickup reminder for an accepted loan', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({
          status: 'accepted',
          pickupCode: 'ABC123',
          user: 9,
          book: { id: 1, title: 'الفيزياء' },
        }),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await sendLoanReminder(5)

      expect(result).toEqual({ ok: true })
      const args = notificationArgs()
      expect(args).toEqual(
        expect.objectContaining({
          user: 9,
          type: 'loan',
          title: 'تذكير باستلام الكتاب',
          link: '/user/my-loans',
          email: true,
        }),
      )
      expect(args.message).toContain('الفيزياء')
      expect(args.message).toContain('ABC123')
    })

    it('folds in missing pickup details gracefully', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({ status: 'accepted', user: 9, book: 7 }),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await sendLoanReminder(5)

      expect(notificationArgs().message).toBe(
        'تم تذكيرك باستلام كتاب «». رمز الاستلام: . يرجى التوجه للمكتبة قبل انتهاء مدة الاستلام.',
      )
    })

    it('sends a return reminder with the due date for a picked-up loan', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({
          status: 'picked_up',
          dueDate: '2026-09-30T09:00:00.000Z',
          user: { id: 9 },
          book: { id: 1, title: 'السيرة' },
        }),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await sendLoanReminder(5)

      expect(result).toEqual({ ok: true })
      const args = notificationArgs()
      expect(args.title).toBe('تذكير بإرجاع الكتاب')
      expect(args.message).toContain('السيرة')
      expect(args.message).toContain(formatArabicDate('2026-09-30T09:00:00.000Z'))
    })

    it('sends a return reminder without a due date', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({
          status: 'picked_up',
          user: 9,
          book: { id: 1, title: 'السيرة' },
        }),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      await sendLoanReminder(5)

      expect(notificationArgs().title).toBe('تذكير بإرجاع الكتاب')
      expect(notificationArgs().message).toBe('تم تذكيرك بإرجاع كتاب «السيرة» في الموعد المحدد.')
    })

    it('refuses to remind for a status without a reminder', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue({
          status: 'pending',
          user: 9,
          book: { id: 1, title: 'السيرة' },
        }),
      }
      getAdminCtx.mockResolvedValue(adminCtx({ payload }))

      const result = await sendLoanReminder(5)

      expect(result).toEqual({ ok: false, error: 'لا يمكن إرسال تذكير لهذه الحالة' })
      expect(createNotification).not.toHaveBeenCalled()
    })
  })
})
