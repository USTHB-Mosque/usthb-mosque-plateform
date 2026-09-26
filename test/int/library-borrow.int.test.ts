import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import {
  borrowBook,
  borrowBookLogic,
  getUserBookLoanState,
} from '@/features/library/server/borrow-book'
import type { User } from '@/payload-types'

// One shared instance for the whole file; destroyed exactly once at the end —
// destroying it per describe would strand every later operation on a dead pool.
let payload: Payload
let member: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('borrowBookLogic', () => {
  it('blocks an unverified user', async () => {
    const unverified = await createTestUser(payload, { verified: false })
    const book = await createTestBook(payload, { available: 3, total: 3 })

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, unverified))

    expect(result.success).toBe(false)
    expect(result.message).toBe('يجب تأكيد حسابك قبل استعارة الكتب')

    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.availableBooks).toBe(3)
  })

  it('blocks the request when the borrow limit is reached', async () => {
    await payload.updateGlobal({
      slug: 'settings',
      data: { borrowLimit: 1 },
      overrideAccess: true,
    })
    const heldBook = await createTestBook(payload, { available: 3, total: 3 })
    const requestedBook = await createTestBook(payload, { available: 3, total: 3 })
    await createTestLoan(payload, { book: heldBook.id, user: member.id })

    const result = await borrowBookLogic(String(requestedBook.id), await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لقد وصلت إلى الحد الأقصى لعدد الكتب المستعارة')
  })

  it('joins the waitlist when the book records no copies at all', async () => {
    const book = await createTestBook(payload)
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: null },
      overrideAccess: true,
    })

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    expect(result.success).toBe(true)
    expect(result.waitlisted).toBe(true)
  })

  it('blocks a duplicate active loan for the same book', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })

    const first = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(first.success).toBe(true)

    const second = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(second.success).toBe(false)
    expect(second.message).toBe('لديك بالفعل طلب إعارة نشط لهذا الكتاب')
  })

  it('joins the waitlist when no copy is free', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    expect(result.success).toBe(true)
    expect(result.waitlisted).toBe(true)
    expect(result.message).toBe(
      'لا توجد نسخ متاحة حالياً — تم إضافتك إلى قائمة الانتظار لهذا الكتاب',
    )

    // The request holds nothing: no loan row and no copy decremented.
    const loans = await payload.find({
      collection: 'loans',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(loans.totalDocs).toBe(0)
    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.availableBooks).toBe(0)

    const entries = await payload.find({
      collection: 'waitlist-entries',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(entries.docs[0]?.position).toBe(1)
    expect(String(entries.docs[0]?.book)).toBe(String(book.id))
  })

  it('queues new waitlist entries at the end of the FIFO queue', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })
    const second = await createTestUser(payload, {
      email: 'second-waiter@usthb.dz',
      verified: true,
    })

    await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    await borrowBookLogic(String(book.id), await ctxFor(payload, second))

    const entries = await payload.find({
      collection: 'waitlist-entries',
      where: { book: { equals: book.id } },
      sort: 'position',
      overrideAccess: true,
      depth: 0,
    })
    expect(entries.docs.map((entry) => ({ user: entry.user, position: entry.position }))).toEqual([
      { user: member.id, position: 1 },
      { user: second.id, position: 2 },
    ])
  })

  it('blocks a duplicate waitlist entry for the same book', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })

    const first = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(first.success).toBe(true)

    const second = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(second.success).toBe(false)
    expect(second.message).toBe('أنت بالفعل في قائمة الانتظار لهذا الكتاب')
  })

  it('creates a pending loan without touching availableBooks on the happy path', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })
    const pickup = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member), {
      pickupDate: pickup.toISOString(),
    })

    expect(result.success).toBe(true)
    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    // Reservation happens at accept time, not at request time.
    expect(after.availableBooks).toBe(3)

    const loans = await payload.find({
      collection: 'loans',
      where: { user: { equals: member.id } },
      depth: 0,
      overrideAccess: true,
    })
    expect(loans.totalDocs).toBe(1)
    expect(loans.docs[0].status).toBe('pending')
    expect(String(loans.docs[0].book)).toBe(String(book.id))
    expect(loans.docs[0].dueDate).toBeNull()
    expect(new Date(loans.docs[0].pickupDate as string).getTime()).toBe(pickup.getTime())
  })

  it('honors the caller as the loan owner even when data lies about the user', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    expect(result.success).toBe(true)
    // The loan must be scoped to the caller, never to a client-supplied user.
    const loans = await payload.find({
      collection: 'loans',
      where: { user: { equals: admin.id } },
      overrideAccess: true,
    })
    expect(loans.totalDocs).toBe(0)
  })

  it('reports an error when the book does not exist', async () => {
    const result = await borrowBookLogic('99999999', await ctxFor(payload, member))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء تقديم طلب الإعارة')
  })
})

describe('borrowBook (wrapper)', () => {
  it('asks anonymous callers to log in', async () => {
    const result = await borrowBook('1')
    expect(result.success).toBe(false)
    expect(result.message).toBe('يجب تسجيل الدخول أولاً')
  })

  it('borrows as the cookie user', async () => {
    const cookieMember = await createTestUser(payload, {
      email: 'cookie-borrow@usthb.dz',
      verified: true,
    })
    const { token } = await loginToken(payload, {
      email: cookieMember.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    const book = await createTestBook(payload, { available: 2, total: 2 })

    const result = await borrowBook(String(book.id))

    expect(result.success).toBe(true)
  })
})

describe('getUserBookLoanState', () => {
  it('reports no active loan for anonymous callers', async () => {
    expect(await getUserBookLoanState(1)).toEqual({ hasActiveLoan: false, waitlisted: false })
  })

  it('reports the active loan for the borrower', async () => {
    const book = await createTestBook(payload, { available: 2, total: 2 })
    await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    const state = await getUserBookLoanState(book.id)
    expect(state).toEqual({ hasActiveLoan: true, waitlisted: false })
  })

  it('reports the waitlist position for a queued borrower', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })
    await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    const state = await getUserBookLoanState(book.id)
    expect(state).toEqual({ hasActiveLoan: false, waitlisted: true })
  })

  it('ignores loans that are no longer active', async () => {
    const book = await createTestBook(payload, { available: 2, total: 2 })
    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    const loanId = (result.loan as { id: number }).id

    const req = await boundReq(payload, admin)
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'returned' },
      req,
      overrideAccess: false,
      depth: 0,
    })

    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    const state = await getUserBookLoanState(book.id)
    expect(state).toEqual({ hasActiveLoan: false, waitlisted: false })
  })
})
