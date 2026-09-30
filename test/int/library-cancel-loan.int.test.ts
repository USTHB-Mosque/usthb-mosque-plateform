import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'
import { CANCEL_UNAVAILABLE_MESSAGE } from '@/shared/lib/loan-gates'
import { cancelLoan, cancelLoanLogic } from '@/features/library/server/cancel-loan'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

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
  otherMember = await createTestUser(payload, { email: 'other-borrower@usthb.dz', verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
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

async function memberAfter() {
  return payload.findByID({ collection: 'users', id: member.id, overrideAccess: true, depth: 0 })
}

async function notificationsFor(userId: number) {
  const rows = await payload.find({
    collection: 'notifications',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    overrideAccess: true,
    depth: 0,
  })
  return rows.docs
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

/** How much of the D7 borrow budget this member is still using. */
async function activeLoanCount(userId: number) {
  const counted = await payload.count({
    collection: 'loans',
    where: {
      and: [{ user: { equals: userId } }, { status: { in: [...ACTIVE_LOAN_STATUSES] } }],
    },
    overrideAccess: true,
  })
  return counted.totalDocs
}

/**
 * Accepts a pending Loan the way the administration would, so the copy is
 * actually reserved and the borrower is actually told. That is the state D6
 * cancellation has to unwind — a Loan created straight at `accepted` would
 * never have reserved anything and would prove nothing.
 */
async function acceptedLoan(bookId: number) {
  const loan = await createTestLoan(payload, { book: bookId, user: member.id })
  await payload.update({
    collection: 'loans',
    id: loan.id,
    data: { status: 'accepted' },
    overrideAccess: true,
  })
  return loan
}

describe('cancelLoanLogic (#153, D6)', () => {
  it('refuses to cancel a loan the caller does not hold', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: otherMember.id })

    const result = await cancelLoanLogic(loan.id, await ctxFor(payload, member))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكنك إلغاء إعارة لست مالكها')
    expect((await loanAfter(loan.id)).status).toBe('pending')
  })

  it.each(['picked_up', 'returned', 'refused', 'cancelled'] as const)(
    'refuses a %s loan — the book has already changed hands or the state is final',
    async (status) => {
      sendEmailSpy()
      const book = await createTestBook(payload)
      const loan = await createTestLoan(payload, { book: book.id, user: member.id, status })

      const result = await cancelLoanLogic(loan.id, await ctxFor(payload, member))

      expect(result.success).toBe(false)
      expect(result.message).toBe(CANCEL_UNAVAILABLE_MESSAGE)
      expect((await loanAfter(loan.id)).status).toBe(status)
    },
  )

  it('cancels a pending request without releasing anything, telling anyone, or costing a slot', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload, { available: 2, total: 5 })
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await cancelLoanLogic(loan.id, await ctxFor(payload, member))

    expect(result).toEqual({
      success: true,
      message: 'تم إلغاء طلب الإعارة',
      loanId: loan.id,
    })
    const after = await loanAfter(loan.id)
    expect(after.status).toBe('cancelled')
    // There was no administration decision, so there is no reason to record.
    expect(after.refusalReason).toBeNull()

    // `pending` never reserved a copy, so nothing goes back on the shelf.
    expect((await bookAfter(book.id)).availableBooks).toBe(2)

    // The member pressed the button, so there is nobody to notify — and above
    // all no "تم رفض طلب الإعارة", which would describe an event that never
    // happened.
    const notes = await notificationsFor(member.id)
    expect(notes).toHaveLength(0)

    // D6 contrasts cancelling (which helps the queue) with a no-show (which
    // delays it): the counter must not move.
    expect((await memberAfter()).noShowCount ?? 0).toBe(0)
    expect((await memberAfter()).borrowingBlockedAt).toBeNull()

    // The D7 budget slot is handed straight back.
    expect(await activeLoanCount(member.id)).toBe(0)
  })

  it('cancels an accepted loan: releases the copy, promotes the queue, and stays silent to the borrower', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload, { available: 1, total: 5 })
    const loan = await acceptedLoan(book.id)
    expect((await bookAfter(book.id)).availableBooks).toBe(0)

    const waiter = await createTestUser(payload, { email: 'waiter@usthb.dz', verified: true })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: waiter.id, position: 1 },
      overrideAccess: true,
    })

    const noticesBefore = (await notificationsFor(member.id)).length

    const result = await cancelLoanLogic(loan.id, await ctxFor(payload, member))
    expect(result.success).toBe(true)

    expect((await loanAfter(loan.id)).status).toBe('cancelled')

    // The reserved copy went back to the shelf and the queue head followed it.
    expect((await bookAfter(book.id)).availableBooks).toBe(1)
    expect(await waitlistAfter(book.id)).toEqual([])
    const promoted = await payload.find({
      collection: 'loans',
      where: { and: [{ user: { equals: waiter.id } }, { book: { equals: book.id } }] },
      overrideAccess: true,
      depth: 0,
    })
    expect(promoted.totalDocs).toBe(1)
    expect(promoted.docs[0].status).toBe('pending')

    // The one person this helps is told. The borrower is not told anything,
    // least of all that their request was "refused".
    const waiterNotes = await notificationsFor(waiter.id)
    expect(waiterNotes.some((note) => note.title === 'الكتاب متاح الآن لاستعارتك')).toBe(true)
    const notes = await notificationsFor(member.id)
    expect(notes.some((note) => note.title === 'تم رفض طلب الإعارة')).toBe(false)
    expect(notes).toHaveLength(noticesBefore)

    // Not a no-show: no counter, no block.
    expect((await memberAfter()).noShowCount ?? 0).toBe(0)
    expect((await memberAfter()).borrowingBlockedAt).toBeNull()

    // The slot is free again, so the member could ask for another book.
    expect(await activeLoanCount(member.id)).toBe(0)
  })

  it('writes an audit row naming the actor and the loan', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    await cancelLoanLogic(loan.id, await ctxFor(payload, member))

    // SPEC §13 justifies the missing history collection on the audit log, so a
    // copy that quietly returns to the shelf has to say who released it.
    const logs = await payload.find({
      collection: 'logs',
      where: { action: { equals: 'loan_cancelled' } },
      overrideAccess: true,
      depth: 0,
    })
    expect(logs.totalDocs).toBe(1)
    expect(logs.docs[0].actor).toBe(member.id)
    expect(logs.docs[0].targetType).toBe('loan')
    expect(logs.docs[0].targetId).toBe(String(loan.id))
    expect(logs.docs[0].message).toContain(String(loan.id))
  })

  it('reports a generic failure for a loan that does not exist', async () => {
    const result = await cancelLoanLogic(99999999, await ctxFor(payload, member))
    expect(result).toEqual({
      success: false,
      message: 'حدث خطأ أثناء إلغاء طلب الإعارة',
    })
  })

  it('is not an back door for the administration — an admin still cannot cancel a member loan', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    // Admins keep their own transitions (`refuseLoan`, with its mandatory
    // reason); this action exists for the borrower and checks only that.
    const result = await cancelLoanLogic(loan.id, await ctxFor(payload, admin))

    expect(result.success).toBe(false)
    expect(result.message).toBe('لا يمكنك إلغاء إعارة لست مالكها')
    expect((await loanAfter(loan.id)).status).toBe('pending')
  })
})

describe('cancelLoan (cookie flow)', () => {
  it('asks anonymous callers to log in', async () => {
    expect(await cancelLoan('1')).toEqual({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    })
  })

  it("cancels the caller's own request as the cookie member", async () => {
    sendEmailSpy()
    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })

    const result = await cancelLoan(loan.id)

    expect(result.success).toBe(true)
    expect((await loanAfter(loan.id)).status).toBe('cancelled')
    expect(await activeLoanCount(member.id)).toBe(0)
  })
})
