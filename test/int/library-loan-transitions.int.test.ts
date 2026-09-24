import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { SKIP_LOAN_LIFECYCLE } from '@/utils/constants/loans'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import {
  acceptLoan,
  acceptLoanLogic,
  markLoanPickedUp,
  markLoanPickedUpLogic,
  markLoanReturned,
  markLoanReturnedLogic,
  refuseLoan,
  refuseLoanLogic,
} from '@/features/library/server/loan-transitions'
import { syncOverdueLoans } from '@/features/library/server/overdue'

// One shared instance for the whole file; destroyed exactly once at the end —
// destroying it per describe would strand every later operation on a dead pool.
let payload: Payload
let member: User
let otherMember: User
let admin: User

const sendEmailSpy = () => vi.spyOn(payload, 'sendEmail').mockImplementation(async () => undefined)

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { verified: true })
  otherMember = await createTestUser(payload, { email: 'other-waiter@usthb.dz', verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function bookAfter(bookId: number) {
  return payload.findByID({ collection: 'books', id: bookId, overrideAccess: true, depth: 0 })
}

async function loanAfter(loanId: number) {
  return payload.findByID({ collection: 'loans', id: loanId, overrideAccess: true, depth: 0 })
}

async function waitlistAfter(bookId: number) {
  const entries = await payload.find({
    collection: 'waitlist-entries',
    where: { book: { equals: bookId } },
    sort: 'position',
    overrideAccess: true,
    depth: 0,
  })
  return entries.docs.map((entry) => ({ user: entry.user, position: entry.position }))
}

describe('acceptLoanLogic', () => {
  it('refuses a non-admin actor', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await acceptLoanLogic(loan.id, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('غير مصرح لك بتنفيذ هذا الإجراء')
    expect((await loanAfter(loan.id)).status).toBe('pending')
  })

  it('refuses a loan that is not pending', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
    })

    const result = await acceptLoanLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكن قبول طلب ليس في حالة الانتظار')
  })

  it('reserves the copy, generates a unique pickup code and stamps the pickup schedule', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload, { available: 3, total: 3 })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { code: 'مك-01' },
      overrideAccess: true,
    })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const result = await acceptLoanLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(true)
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('accepted')
    expect(after.pickupCode).toMatch(/^مك-01\//)
    expect(after.pickupDate).toBeTruthy()
    expect(after.pickupHour).toMatch(/^\d{2}:\d{2}$/)

    // The copy is reserved at accept time, not at request time.
    expect((await bookAfter(book.id)).availableBooks).toBe(2)

    // The borrower is notified.
    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.type).toBe('loan')
    expect(notifications.docs[0]?.title).toBe('تم قبول طلب الإعارة')
    expect(notifications.docs[0]?.message).toContain(after.pickupCode!)
  })

  it('treats a book with no recorded copies as unreservable', async () => {
    const book = await createTestBook(payload)
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: null },
      overrideAccess: true,
    })
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await acceptLoanLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect((await bookAfter(book.id)).availableBooks).toBeNull()
  })

  it('defaults the pickup schedule to accept time when the borrower never picked one', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    await acceptLoanLogic(loan.id, await ctxFor(payload, admin))

    const after = await loanAfter(loan.id)
    expect(after.pickupDate).toBeTruthy()
    expect(after.pickupHour).toBeTruthy()
  })

  it('keeps an existing pickup code when a loan is re-accepted', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'returned',
      pickupCode: 'مك-01/1/26',
    })

    // A direct admin-panel edit that flips a returned loan back to accepted
    // must not mint a second code.
    await payload.update({
      collection: 'loans',
      id: loan.id,
      data: { status: 'accepted' },
      req: await boundReq(payload, admin),
      overrideAccess: false,
      depth: 0,
    })

    const after = await loanAfter(loan.id)
    expect(after.status).toBe('accepted')
    expect(after.pickupCode).toBe('مك-01/1/26')
    // The pickup schedule is re-stamped for the new accept.
    expect(after.pickupDate).toBeTruthy()
    expect(after.pickupHour).toMatch(/^\d{2}:\d{2}$/)
  })

  it('fails the accept when no copy is left and reserves nothing', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await acceptLoanLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء تحديث حالة الإعارة')
    // The transaction rolled back: the loan is still pending, no copy taken.
    expect((await loanAfter(loan.id)).status).toBe('pending')
    expect((await bookAfter(book.id)).availableBooks).toBe(0)
  })

  it('reports an error when the loan does not exist', async () => {
    const result = await acceptLoanLogic(99999999, await ctxFor(payload, admin))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء تحديث حالة الإعارة')
  })
})

describe('refuseLoanLogic', () => {
  it('refuses a non-admin actor', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await refuseLoanLogic(loan.id, 'سبب', await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('غير مصرح لك بتنفيذ هذا الإجراء')
  })

  it('requires a reason', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await refuseLoanLogic(loan.id, '   ', await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('يجب إدخال سبب الرفض')
  })

  it('refuses a loan that is neither pending nor accepted', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
    })

    const result = await refuseLoanLogic(loan.id, 'سبب', await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكن رفض إعارة بهذه الحالة')
  })

  it('refuses a pending loan with its reason and notifies the borrower', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await refuseLoanLogic(
      loan.id,
      'الكتاب محجوز للصيانة',
      await ctxFor(payload, admin),
    )

    expect(result.success).toBe(true)
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('refused')
    expect(after.refusalReason).toBe('الكتاب محجوز للصيانة')
    // A pending loan holds nothing: the count is untouched.
    expect((await bookAfter(book.id)).availableBooks).toBe(3)

    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.title).toBe('تم رفض طلب الإعارة')
    expect(notifications.docs[0]?.message).toContain('الكتاب محجوز للصيانة')
  })

  it('releases the reserved copy when an accepted loan is refused', async () => {
    const book = await createTestBook(payload, { available: 2, total: 2 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupCode: 'مك-01/1/26',
    })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: 1 },
      overrideAccess: true,
    })

    const result = await refuseLoanLogic(loan.id, 'لم يحضر', await ctxFor(payload, admin))

    expect(result.success).toBe(true)
    expect((await loanAfter(loan.id)).status).toBe('refused')
    expect((await bookAfter(book.id)).availableBooks).toBe(2)
  })

  it('reports an error when the loan does not exist', async () => {
    const result = await refuseLoanLogic(99999999, 'سبب', await ctxFor(payload, admin))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء تحديث حالة الإعارة')
  })
})

describe('markLoanPickedUpLogic', () => {
  it('refuses a non-admin actor', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
    })

    const result = await markLoanPickedUpLogic(loan.id, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('غير مصرح لك بتنفيذ هذا الإجراء')
  })

  it('refuses a loan that is not accepted', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await markLoanPickedUpLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكن تسجيل أخذ كتاب لطلب غير مقبول')
  })

  it('stamps the due date from the book duration', async () => {
    const book = await createTestBook(payload)
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { loanDurationDays: 7 },
      overrideAccess: true,
    })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupCode: 'مك-01/1/26',
    })

    const result = await markLoanPickedUpLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(true)
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('picked_up')
    expect(after.dueDate).toBeTruthy()
    const expected = Date.now() + 7 * 24 * 60 * 60 * 1000
    expect(new Date(after.dueDate as string).getTime()).toBeGreaterThan(expected - 60_000)
    expect(new Date(after.dueDate as string).getTime()).toBeLessThan(expected + 60_000)
  })

  it('falls back to the Settings global when the book has no duration', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupCode: 'مك-01/1/26',
    })

    await markLoanPickedUpLogic(loan.id, await ctxFor(payload, admin))

    const after = await loanAfter(loan.id)
    const expected = Date.now() + 14 * 24 * 60 * 60 * 1000
    expect(new Date(after.dueDate as string).getTime()).toBeGreaterThan(expected - 60_000)
    expect(new Date(after.dueDate as string).getTime()).toBeLessThan(expected + 60_000)
  })

  it('reports an error when the loan does not exist', async () => {
    const result = await markLoanPickedUpLogic(99999999, await ctxFor(payload, admin))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء تحديث حالة الإعارة')
  })
})

describe('markLoanReturnedLogic', () => {
  it('refuses a non-admin actor', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
    })

    const result = await markLoanReturnedLogic(loan.id, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('غير مصرح لك بتنفيذ هذا الإجراء')
  })

  it('refuses a loan that was never picked up', async () => {
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await markLoanReturnedLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكن إرجاع إعارة لم تؤخذ بعد')
  })

  it('releases the copy and promotes the queue head in one transaction', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload, { available: 0, total: 5 })
    // The picked-up loan holds the last copy; two waiters queued behind it.
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const waiter1 = await createTestUser(payload, { email: 'waiter1@usthb.dz', verified: true })
    const waiter2 = await createTestUser(payload, { email: 'waiter2@usthb.dz', verified: true })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: waiter1.id, position: 1 },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: waiter2.id, position: 2 },
      overrideAccess: true,
    })

    const result = await markLoanReturnedLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(true)
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('returned')
    expect(after.returnDate).toBeTruthy()

    // The copy is back...
    expect((await bookAfter(book.id)).availableBooks).toBe(1)
    // ...the queue head was promoted into a pending loan...
    const promotedLoans = await payload.find({
      collection: 'loans',
      where: { and: [{ user: { equals: waiter1.id } }, { book: { equals: book.id } }] },
      overrideAccess: true,
      depth: 0,
    })
    expect(promotedLoans.totalDocs).toBe(1)
    expect(promotedLoans.docs[0].status).toBe('pending')
    // ...their entry is gone and the rest resequenced FIFO.
    expect(await waitlistAfter(book.id)).toEqual([{ user: waiter2.id, position: 1 }])

    // The promoted user is notified.
    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: waiter1.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.type).toBe('waitlist')
    expect(notifications.docs[0]?.title).toBe('الكتاب متاح الآن لاستعارتك')
  })

  it('releases the copy even when the book never recorded a count', async () => {
    const book = await createTestBook(payload, { available: 1, total: 1 })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: null },
      overrideAccess: true,
    })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
    })

    await markLoanReturnedLogic(loan.id, await ctxFor(payload, admin))

    // null reads as zero, so the release puts exactly one copy back.
    expect((await bookAfter(book.id)).availableBooks).toBe(1)
  })

  it('returns without promoting when the waitlist is empty', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
    })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: 1 },
      overrideAccess: true,
    })

    await markLoanReturnedLogic(loan.id, await ctxFor(payload, admin))

    expect((await bookAfter(book.id)).availableBooks).toBe(2)
    const notifications = await payload.find({
      collection: 'notifications',
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.totalDocs).toBe(0)
  })

  it('skips a waiter who already holds an active loan and resequences the rest', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload, { available: 0, total: 5 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
    })
    // waiter1 already borrowed another copy of the same book elsewhere; the
    // promotion must skip them and hand the slot to waiter2.
    await createTestLoan(payload, { book: book.id, user: otherMember.id, status: 'accepted' })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: member.id, position: 2 },
      overrideAccess: true,
    })

    await markLoanReturnedLogic(loan.id, await ctxFor(payload, admin))

    // waiter1 keeps their position 1 (untouched by the resequence); member is
    // promoted into a pending loan.
    expect(await waitlistAfter(book.id)).toEqual([{ user: otherMember.id, position: 1 }])
    const promoted = await payload.find({
      collection: 'loans',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(promoted.docs.some((loan) => loan.status === 'pending')).toBe(true)
  })

  it('rolls the whole return back when the promotion fails', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
    })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: otherMember.id, position: 1 },
      overrideAccess: true,
    })

    const original = payload.create.bind(payload)
    const spy = vi.spyOn(payload, 'create').mockImplementation(((args: { collection: string }) => {
      if (args.collection === 'loans') throw new Error('boom')
      return original(args as never)
    }) as typeof payload.create)

    const result = await markLoanReturnedLogic(loan.id, await ctxFor(payload, admin))

    spy.mockRestore()
    expect(result.success).toBe(false)
    // Nothing of the transition survived: loan still picked_up, copy still
    // held, waiter still queued.
    expect((await loanAfter(loan.id)).status).toBe('picked_up')
    expect((await bookAfter(book.id)).availableBooks).toBe(0)
    expect((await waitlistAfter(book.id)).length).toBe(1)
  })

  it('reports an error when the loan does not exist', async () => {
    const result = await markLoanReturnedLogic(99999999, await ctxFor(payload, admin))
    expect(result.success).toBe(false)
    expect(result.message).toBe('حدث خطأ أثناء تحديث حالة الإعارة')
  })
})

describe('lifecycle re-entrancy guard', () => {
  it('does nothing when the guard context flag is set', async () => {
    const book = await createTestBook(payload, { available: 2, total: 2 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await payload.update({
      collection: 'loans',
      id: loan.id,
      data: { status: 'returned' },
      req: await boundReq(payload, admin),
      overrideAccess: false,
      context: { [SKIP_LOAN_LIFECYCLE]: true },
    })

    // Guarded: no release, no stamps beyond what the caller supplied.
    expect((await bookAfter(book.id)).availableBooks).toBe(2)
    expect((await loanAfter(loan.id)).status).toBe('returned')
    expect((await loanAfter(loan.id)).returnDate).toBeNull()
  })

  it('stamps each loan exactly once per transition', async () => {
    const book = await createTestBook(payload, { available: 1, total: 1 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupCode: 'مك-01/1/26',
    })

    const updateSpy = vi.spyOn(payload, 'update')
    await markLoanPickedUpLogic(loan.id, await ctxFor(payload, admin))

    const loanWrites = updateSpy.mock.calls.filter(
      (call) => (call[0] as { collection?: string }).collection === 'loans',
    )
    updateSpy.mockRestore()
    // One write from the transition, one write-back from the hook — and no
    // cascade of the hook into itself.
    expect(loanWrites.length).toBe(2)
    expect((await bookAfter(book.id)).availableBooks).toBe(1)
  })
})

describe('overdue: lazy check on read', () => {
  it('notifies the borrower exactly once for a loan past its due date', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
      // Already overdue: picked_up loans past their due date are overdue by
      // derivation, never stored.
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const first = await syncOverdueLoans(await ctxFor(payload, member))
    expect(first).toBe(1)

    const notifications = await payload.find({
      collection: 'notifications',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(notifications.docs[0]?.type).toBe('loan')
    expect(notifications.docs[0]?.title).toBe('إعارة متأخرة')

    const flagged = await payload.find({
      collection: 'loans',
      where: { user: { equals: member.id } },
      overrideAccess: true,
      depth: 0,
    })
    expect(flagged.docs[0]?.overdueNotified).toBe(true)
    expect(flagged.docs[0]?.status).toBe('picked_up')

    // Reading again must not notify twice.
    const second = await syncOverdueLoans(await ctxFor(payload, member))
    expect(second).toBe(0)
    expect(
      (
        await payload.find({
          collection: 'notifications',
          where: { user: { equals: member.id } },
          overrideAccess: true,
          depth: 0,
        })
      ).totalDocs,
    ).toBe(1)
  })

  it('leaves on-time loans alone', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      pickupCode: 'مك-01/1/26',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    expect(await syncOverdueLoans(await ctxFor(payload, member))).toBe(0)
    expect(
      (
        await payload.find({
          collection: 'notifications',
          overrideAccess: true,
          depth: 0,
        })
      ).totalDocs,
    ).toBe(0)
  })
})

describe('transitions wrappers (cookie flows)', () => {
  it('asks anonymous callers to log in', async () => {
    expect(await acceptLoan('1')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
    expect(await refuseLoan('1', 'سبب')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
    expect(await markLoanPickedUp('1')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
    expect(await markLoanReturned('1')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
  })

  it('runs the full lifecycle as the cookie admin', async () => {
    sendEmailSpy()
    const { token } = await loginToken(payload, {
      email: admin.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    expect((await acceptLoan(loan.id)).success).toBe(true)
    expect((await loanAfter(loan.id)).status).toBe('accepted')

    expect((await markLoanPickedUp(loan.id)).success).toBe(true)
    expect((await loanAfter(loan.id)).status).toBe('picked_up')

    expect((await refuseLoan(loan.id, 'متأخر جداً')).success).toBe(false)
    const returned = await markLoanReturned(loan.id)
    expect(returned.success).toBe(true)
    expect((await loanAfter(loan.id)).status).toBe('returned')
  })
})

describe('loan create guard (REST surface)', () => {
  it('forces a member create to be their own fresh pending request', async () => {
    const book = await createTestBook(payload)

    const req = await boundReq(payload, member)
    const loan = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: admin.id,
        status: 'picked_up',
        loanDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
      },
      req,
      overrideAccess: false,
      depth: 0,
    })

    expect(loan.status).toBe('pending')
    expect(String(loan.user)).toBe(String(member.id))
  })

  it('throws the Arabic verification message for unverified members', async () => {
    const unverified = await createTestUser(payload, { email: 'unverified@usthb.dz' })
    const book = await createTestBook(payload)
    const req = await boundReq(payload, unverified)

    await expect(
      payload.create({
        collection: 'loans',
        data: { book: book.id, user: unverified.id, loanDate: new Date().toISOString() },
        req,
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('يجب تأكيد حسابك قبل استعارة الكتب')
  })

  it('throws the borrow-limit message at the configured limit', async () => {
    await payload.updateGlobal({
      slug: 'settings',
      data: { borrowLimit: 1 },
      overrideAccess: true,
    })
    const book1 = await createTestBook(payload)
    const book2 = await createTestBook(payload)
    await createTestLoan(payload, { book: book1.id, user: member.id })

    await expect(
      payload.create({
        collection: 'loans',
        data: { book: book2.id, user: member.id, loanDate: new Date().toISOString() },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('لقد وصلت إلى الحد الأقصى لعدد الكتب المستعارة')
  })

  it('throws on a duplicate active loan through the REST surface', async () => {
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id })

    await expect(
      payload.create({
        collection: 'loans',
        data: { book: book.id, user: member.id, loanDate: new Date().toISOString() },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('لديك بالفعل طلب إعارة نشط لهذا الكتاب')
  })

  it('throws on a duplicate waitlist entry through the REST surface', async () => {
    const book = await createTestBook(payload, { available: 0, total: 5 })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: member.id, position: 1 },
      overrideAccess: true,
    })

    await expect(
      payload.create({
        collection: 'loans',
        data: { book: book.id, user: member.id, loanDate: new Date().toISOString() },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('أنت بالفعل في قائمة الانتظار لهذا الكتاب')
  })

  it('the waitlist hook refuses a duplicate queued row bypassing the action', async () => {
    const book = await createTestBook(payload)
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: member.id, position: 1 },
      overrideAccess: true,
    })

    await expect(
      payload.create({
        collection: 'waitlist-entries',
        data: { book: book.id, user: member.id, position: 2 },
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow('أنت بالفعل في قائمة الانتظار لهذا الكتاب')
  })

  it('the waitlist hook leaves rows without a book to required-field validation', async () => {
    await expect(
      payload.create({
        collection: 'waitlist-entries',
        data: { user: member.id, position: 1 } as never,
        req: await boundReq(payload, member),
        overrideAccess: false,
        depth: 0,
      }),
    ).rejects.toThrow()
  })

  it('lets admins and seed scripts create loans in any state', async () => {
    const book = await createTestBook(payload)
    const adminReq = await boundReq(payload, admin)
    const adminLoan = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'picked_up',
        loanDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
      },
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })
    expect(adminLoan.status).toBe('picked_up')
    expect(String(adminLoan.user)).toBe(String(member.id))

    const seedLoan = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: admin.id,
        status: 'refused',
        loanDate: new Date().toISOString(),
      },
      overrideAccess: true,
      depth: 0,
    })
    expect(seedLoan.status).toBe('refused')
  })
})
