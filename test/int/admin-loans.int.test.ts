import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { addLoan, getAdminLoansStats, getLoansByStatus } from '@/features/admin/server/loans'

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

    const paged = await getLoansByStatus('pending', 2, 1)
    expect(paged.docs).toHaveLength(1)
    expect(paged.totalDocs).toBe(2)
    expect(paged.totalPages).toBe(2)
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
})
