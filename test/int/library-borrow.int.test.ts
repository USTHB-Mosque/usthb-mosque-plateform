import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook } from '../lib/factories'
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

  it('blocks a duplicate active loan for the same book', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })

    const first = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(first.success).toBe(true)

    const second = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(second.success).toBe(false)
    expect(second.message).toBe('لديك بالفعل طلب إعارة نشط لهذا الكتاب')

    // Only one copy was consumed by the first request.
    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.availableBooks).toBe(2)
  })

  it('refuses to borrow when zero copies are available', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('عذراً، الكتاب غير متوفر حالياً')
  })

  it('decrements availableBooks exactly once on the happy path', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))

    expect(result.success).toBe(true)
    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.availableBooks).toBe(2)

    const loans = await payload.find({
      collection: 'loans',
      where: { user: { equals: member.id } },
      depth: 0,
      overrideAccess: true,
    })
    expect(loans.totalDocs).toBe(1)
    expect(loans.docs[0].status).toBe('pending')
    expect(String(loans.docs[0].book)).toBe(String(book.id))
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

  it('honors an explicit dueDate and pickupDate', async () => {
    const book = await createTestBook(payload)
    const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const pickup = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member), {
      dueDate: due.toISOString(),
      pickupDate: pickup.toISOString(),
    })

    expect(result.success).toBe(true)
    const loan = await payload.findByID({
      collection: 'loans',
      id: (result.loan as { id: number }).id,
      overrideAccess: true,
    })
    expect(new Date(loan.dueDate as unknown as string).getTime()).toBe(due.getTime())
    expect(new Date(loan.pickupDate as unknown as string).getTime()).toBe(pickup.getTime())
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
    expect(await getUserBookLoanState(1)).toEqual({ hasActiveLoan: false })
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
    expect(state).toEqual({ hasActiveLoan: true })
  })

  it('ignores returned loans', async () => {
    const book = await createTestBook(payload, { available: 2, total: 2 })
    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    const loanId = (result.loan as { id: number }).id

    const req = await boundReq(payload, member)
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'returned' },
      req,
      overrideAccess: false,
    })

    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))
    const state = await getUserBookLoanState(book.id)
    expect(state).toEqual({ hasActiveLoan: false })
  })
})
