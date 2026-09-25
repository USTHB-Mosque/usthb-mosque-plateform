import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  addLoan,
  getAdminLoansStats,
  getLoansByStatus,
  markLoanPickedUp,
  sendLoanReminder,
} from '@/features/admin/server/loans'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

let payload: Payload
let admin: User
let member: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await createTestUser(payload, { role: 'admin', email: 'admin@loans-int.usthb.dz' })
  member = await createTestUser(payload, { verified: true })

  const { token } = await loginToken(payload, {
    email: admin.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))

  vi.spyOn(payload, 'sendEmail').mockImplementation(async () => undefined)
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function loanAfter(loanId: number) {
  return payload.findByID({ collection: 'loans', id: loanId, overrideAccess: true, depth: 0 })
}

async function bookAfter(bookId: number) {
  return payload.findByID({ collection: 'books', id: bookId, overrideAccess: true, depth: 0 })
}

describe('getAdminLoansStats', () => {
  it('counts totals, pending, extension requests and overdue loans', async () => {
    const book = await createTestBook(payload, { available: 1, total: 5 })

    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })

    const overdueLoan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() - 86_400_000).toISOString(),
    })
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })

    await payload.create({
      collection: 'loan-extensions',
      data: { loan: overdueLoan.id, user: member.id, days: 7, status: 'pending' },
      overrideAccess: true,
    })

    const { stats } = await getAdminLoansStats()

    expect(stats).toEqual({
      totalLoans: 3,
      pendingLoans: 1,
      extensionRequests: 1,
      overdueLoans: 1,
    })
  })
})

describe('getLoansByStatus', () => {
  it('returns only loans in the requested status with pagination', async () => {
    const book = await createTestBook(payload)

    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'refused',
      refusalReason: 'سبب الرفض',
    })

    const pending = await getLoansByStatus('pending')
    expect(pending.totalDocs).toBe(2)
    expect(pending.totalPages).toBe(1)
    expect(pending.docs.every((loan) => loan.status === 'pending')).toBe(true)

    const refused = await getLoansByStatus('refused')
    expect(refused.totalDocs).toBe(1)
    expect(refused.docs[0].refusalReason).toBe('سبب الرفض')

    const paged = await getLoansByStatus('pending', { page: 2, limit: 1 })
    expect(paged.docs).toHaveLength(1)
    expect(paged.totalDocs).toBe(2)
    expect(paged.totalPages).toBe(2)
  })

  it('filters loans by a search matching the borrower', async () => {
    const book = await createTestBook(payload)
    const other = await createTestUser(payload, { verified: true, fullName: 'Amina Farah' })

    const otherLoan = await createTestLoan(payload, {
      book: book.id,
      user: other.id,
      status: 'pending',
    })

    const result = await getLoansByStatus('pending', { search: 'Farah' })

    const ids = result.docs.map((loan) => loan.id)
    expect(ids).toEqual([otherLoan.id])
    expect((result.docs[0].user as User).id).toBe(other.id)
  })

  it('filters loans by a search matching the book', async () => {
    const science = await createTestBook(payload, { title: 'علوم الإسلام الحديثة' })
    const other = await createTestBook(payload, { title: 'غير ذلك' })

    const target = await createTestLoan(payload, {
      book: science.id,
      user: member.id,
      status: 'pending',
    })
    await createTestLoan(payload, { book: other.id, user: member.id, status: 'pending' })

    const result = await getLoansByStatus('pending', { search: 'علوم الإسلام' })

    const ids = result.docs.map((loan) => loan.id)
    expect(ids).toEqual([target.id])
  })

  it('returns no loans when the search matches nothing', async () => {
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })

    const result = await getLoansByStatus('pending', { search: 'xyz-not-found' })

    expect(result.totalDocs).toBe(0)
    expect(result.docs).toHaveLength(0)
  })

  it('filters picked-up loans by overdue and not-overdue', async () => {
    const book = await createTestBook(payload)

    const overdue = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() - 86_400_000).toISOString(),
    })
    const future = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })

    const overdueResult = await getLoansByStatus('picked_up', { overdue: 'overdue' })
    expect(overdueResult.docs.map((l) => l.id)).toEqual([overdue.id])

    const futureResult = await getLoansByStatus('picked_up', { overdue: 'not-overdue' })
    const ids = futureResult.docs.map((l) => l.id)
    expect(ids).toContain(future.id)
    expect(ids).not.toContain(overdue.id)
  })
})

describe('addLoan', () => {
  it('creates the loan, accepts it immediately and reserves a copy', async () => {
    const book = await createTestBook(payload, { available: 2, total: 4 })

    const result = await addLoan(book.id, member.id)

    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('loanId')

    const loanId = (result as { loanId: number }).loanId
    const loan = await loanAfter(loanId)
    expect(loan.status).toBe('accepted')
    expect(loan.pickupCode).toBeTruthy()

    const after = await bookAfter(book.id)
    expect(after.availableBooks).toBe(1)
  })

  it('rejects when no copies are available', async () => {
    const book = await createTestBook(payload, { available: 0, total: 1 })

    const result = await addLoan(book.id, member.id)

    expect(result).toEqual({ ok: false, error: 'لا توجد نسخ متاحة حالياً' })
  })

  it('returns an error when the book does not exist', async () => {
    const result = await addLoan(999_999, member.id)

    expect(result).toEqual({ ok: false, error: 'الكتاب غير موجود' })
  })

  it('stores the admin-scheduled pickup and due dates', async () => {
    const book = await createTestBook(payload, { available: 2, total: 4 })

    const result = await addLoan(book.id, member.id, {
      pickupDate: '2026-10-10T09:00:00.000Z',
      dueDate: '2026-10-24T09:00:00.000Z',
    })

    expect(result.ok).toBe(true)
    const loanId = (result as { loanId: number }).loanId
    const loan = await loanAfter(loanId)
    expect(loan.status).toBe('accepted')
    // The accept hook records the pickup time from the scheduled date...
    expect(loan.pickupDate).toContain('2026-10-10')
    // ...and the due date survives pickup (see markLoanPickedUp describe).
    expect(loan.dueDate).toBe('2026-10-24T09:00:00.000Z')
  })
})

describe('markLoanPickedUp', () => {
  it('marks the loan picked up and stamps the default due date', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
    })
    expect(loan.dueDate).toBeFalsy()

    const result = await markLoanPickedUp(loan.id)

    expect(result.ok).toBe(true)
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('picked_up')
    expect(after.dueDate).toBeTruthy()
  })

  it('keeps an admin-set due date when the loan is picked up', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      dueDate: '2026-11-15T09:00:00.000Z',
    })

    const result = await markLoanPickedUp(loan.id)

    expect(result.ok).toBe(true)
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('picked_up')
    expect(after.dueDate).toBe('2026-11-15T09:00:00.000Z')
  })

  it('rejects a loan that has not been accepted', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'pending',
    })

    const result = await markLoanPickedUp(loan.id)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('لا يمكن تسجيل أخذ كتاب لطلب غير مقبول')
  })
})

describe('sendLoanReminder', () => {
  async function latestNotifications() {
    return payload.find({
      collection: 'notifications',
      overrideAccess: true,
      depth: 0,
      sort: '-createdAt',
      limit: 5,
    })
  }

  it('sends a pickup reminder notification for an accepted loan', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupCode: 'REMIN9',
    })

    const result = await sendLoanReminder(loan.id)

    expect(result.ok).toBe(true)
    const { docs } = await latestNotifications()
    expect(docs[0].type).toBe('loan')
    expect(docs[0].title).toBe('تذكير باستلام الكتاب')
    expect(docs[0].message).toContain('REMIN9')
    expect(docs[0].user).toBe(member.id)
    expect(docs[0].emailSent).toBe(true)
  })

  it('sends a return reminder for a picked-up loan', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: '2026-10-01T09:00:00.000Z',
    })

    const result = await sendLoanReminder(loan.id)

    expect(result.ok).toBe(true)
    const { docs } = await latestNotifications()
    expect(docs[0].title).toBe('تذكير بإرجاع الكتاب')
    expect(docs[0].message).toContain(book.title)
  })

  it('refuses to remind a loan in a non-reminder state', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'pending',
    })

    const result = await sendLoanReminder(loan.id)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('لا يمكن إرسال تذكير لهذه الحالة')
    const { docs } = await latestNotifications()
    expect(docs).toHaveLength(0)
  })
})
