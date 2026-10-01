import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext } from '../lib/next-stubs'
import { PICKUP_WINDOW_QUEUE } from '@/features/library/server/jobs'
import { expirePickupWindows } from '@/features/library/server/pickup-window'
import { NO_SHOW_LIMIT, PICKUP_WINDOW_EXPIRY_REASON } from '@/utils/constants/loans'

import type { Payload } from 'payload'
import type { Loan, User } from '@/payload-types'

let payload: Payload
let member: User

const sendEmailSpy = () => vi.spyOn(payload, 'sendEmail').mockImplementation(async () => undefined)

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  member = await createTestUser(payload, { verified: true })
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

/**
 * Creates an accepted Loan and then drags its window to `expiresAt` (by
 * default just before the real clock). The backdate is a field-only update,
 * which the lifecycle hook ignores — so the loan arrives at the sweep exactly
 * as an acceptance left it, only late.
 */
async function lapsedLoan(
  bookId: number,
  expiresAt = new Date(Date.now() - 60_000),
): Promise<Loan> {
  const loan = await createTestLoan(payload, { book: bookId, user: member.id })
  await payload.update({
    collection: 'loans',
    id: loan.id,
    data: { status: 'accepted' },
    overrideAccess: true,
  })
  return (await payload.update({
    collection: 'loans',
    id: loan.id,
    data: { pickupWindowExpiresAt: expiresAt.toISOString() },
    overrideAccess: true,
  })) as Loan
}

async function notificationsFor(userId: number) {
  const result = await payload.find({
    collection: 'notifications',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    overrideAccess: true,
    depth: 0,
  })
  return result.docs
}

describe('expirePickupWindows (#153, D1/D2)', () => {
  it('refuses a lapsed window, restores the copy, promotes the queue and warns the borrower', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload, { available: 1, total: 5 })
    const loan = await lapsedLoan(book.id)
    const waiter = await createTestUser(payload, { email: 'waiter@usthb.dz', verified: true })
    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: waiter.id, position: 1 },
      overrideAccess: true,
    })

    // The window is already past, so the read-time default (the current
    // instant) is what the safety net and the cron both use.
    const swept = await expirePickupWindows({ payload, req: await boundReq(payload) })

    expect(swept).toBe(1)

    const after = await loanAfter(loan.id)
    expect(after.status).toBe('refused')
    expect(after.refusalReason).toBe(PICKUP_WINDOW_EXPIRY_REASON)

    // The reserved copy went back to the shelf and the queue head followed.
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

    // AC: a copy released by a refusal tells the next member exactly as a copy
    // released by a return does — not a silent promotion.
    const waiterNotes = await notificationsFor(waiter.id)
    expect(waiterNotes.some((note) => note.title === 'الكتاب متاح الآن لاستعارتك')).toBe(true)

    // One notification, in the no-show's words rather than the generic refusal.
    const notes = await notificationsFor(member.id)
    const warning = notes.find((note) => note.title === 'لم تُسجَّل عملية استلام الكتاب')
    expect(warning).toBeTruthy()
    expect(warning?.message).toContain(book.title)
    expect(notes.some((note) => note.title === 'تم رفض طلب الإعارة')).toBe(false)

    // One no-show, and a first one does not block anybody.
    const afterMember = await memberAfter()
    expect(afterMember.noShowCount).toBe(1)
    expect(afterMember.borrowingBlockedAt).toBeNull()

    // SPEC §13 justifies the missing history collection on the audit log, so
    // the audit log has to actually carry the event — with no actor, because
    // nobody was at the desk.
    const logs = await payload.find({
      collection: 'logs',
      where: { action: { equals: 'loan_expired' } },
      overrideAccess: true,
      depth: 0,
    })
    expect(logs.totalDocs).toBe(1)
    expect(logs.docs[0].message).toContain(book.title)
    expect(logs.docs[0].actor).toBeNull()
    expect(logs.docs[0].metadata).toMatchObject({ reason: PICKUP_WINDOW_EXPIRY_REASON })
  })

  it('blocks borrowing at the D2 limit on the second no-show', async () => {
    sendEmailSpy()
    const first = await createTestBook(payload, { title: 'الأول' })
    await lapsedLoan(first.id)
    await expirePickupWindows({ payload, req: await boundReq(payload) })

    expect((await memberAfter()).borrowingBlockedAt).toBeNull()

    const second = await createTestBook(payload, { title: 'الثاني' })
    await lapsedLoan(second.id)
    await expirePickupWindows({ payload, req: await boundReq(payload) })

    const after = await memberAfter()
    expect(after.noShowCount).toBe(NO_SHOW_LIMIT)
    expect(after.borrowingBlockedAt).toBeTruthy()
  })

  it('keeps the first block timestamp when a later no-show lands while already blocked', async () => {
    sendEmailSpy()
    for (const title of ['أ', 'ب', 'ج']) {
      const book = await createTestBook(payload, { title })
      await lapsedLoan(book.id)
      await expirePickupWindows({ payload, req: await boundReq(payload) })
    }

    const after = await memberAfter()
    expect(after.noShowCount).toBe(3)
    // Still set — a third no-show must not silently restart the clock on the
    // block an admin is already looking at.
    expect(after.borrowingBlockedAt).toBeTruthy()
  })

  it('is idempotent: a loan refused once is never counted twice', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await lapsedLoan(book.id)

    expect(await expirePickupWindows({ payload, req: await boundReq(payload) })).toBe(1)
    expect(await expirePickupWindows({ payload, req: await boundReq(payload) })).toBe(0)

    expect((await loanAfter(loan.id)).status).toBe('refused')
    expect((await memberAfter()).noShowCount).toBe(1)
    const logs = await payload.find({
      collection: 'logs',
      where: { action: { equals: 'loan_expired' } },
      overrideAccess: true,
      depth: 0,
    })
    expect(logs.totalDocs).toBe(1)
  })

  it('leaves a window that is still open alone', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, { book: book.id, user: member.id })
    await payload.update({
      collection: 'loans',
      id: loan.id,
      data: { status: 'accepted' },
      overrideAccess: true,
    })

    expect(await expirePickupWindows({ payload, req: await boundReq(payload) })).toBe(0)
    expect((await loanAfter(loan.id)).status).toBe('accepted')
    expect((await memberAfter()).noShowCount).toBe(0)
  })

  it('reads a counter stored as null as zero', async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await lapsedLoan(book.id)
    await payload.update({
      collection: 'users',
      id: member.id,
      data: { noShowCount: null },
      overrideAccess: true,
    })

    await expirePickupWindows({ payload, req: await boundReq(payload) })

    expect((await loanAfter(loan.id)).status).toBe('refused')
    expect((await memberAfter()).noShowCount).toBe(1)
  })

  it('does nothing for a member with no loans at all', async () => {
    expect(await expirePickupWindows({ payload, req: await boundReq(payload) })).toBe(0)
  })
})

describe('expirePickupWindows task on the jobs queue (#153)', () => {
  it('sweeps with an explicit instant and defaults to now when given no input', async () => {
    sendEmailSpy()
    // The instant the sweep is told to judge against, and the deadline the
    // loan carries, are both derived from the real clock rather than pinned to
    // a literal date. Pinning one made this test expire at the moment the
    // literal fell into the past: the loan was created "60s ago" while the
    // sweep judged a day that was already behind it, so the window was not
    // yet late and the loan stayed accepted.
    //
    // The deadline sits deliberately between the two clocks — late relative to
    // the instant below, still in the future relative to the real one — so the
    // loan is only refused when the task honours its input. A sweep that
    // ignored the input and read the wall clock would leave it accepted.
    const instant = new Date(Date.now() + 60 * 60_000)
    const book = await createTestBook(payload)
    const loan = await lapsedLoan(book.id, new Date(instant.getTime() - 30 * 60_000))

    await payload.jobs.queue({
      queue: PICKUP_WINDOW_QUEUE,
      task: 'expirePickupWindows',
      input: { now: instant.toISOString() },
    })
    const explicit = await payload.jobs.run({ queue: PICKUP_WINDOW_QUEUE, limit: 5 })
    expect(Object.keys(explicit.jobStatus ?? {})).toHaveLength(1)
    expect((await loanAfter(loan.id)).status).toBe('refused')

    // A second acceptance with no input: the task falls back to the current
    // instant, which is all the cron ever hands it.
    const later = await createTestBook(payload, { title: 'لاحق' })
    const second = await lapsedLoan(later.id)

    await payload.jobs.queue({ queue: PICKUP_WINDOW_QUEUE, task: 'expirePickupWindows', input: {} })
    const fallback = await payload.jobs.run({ queue: PICKUP_WINDOW_QUEUE, limit: 5 })
    expect(Object.keys(fallback.jobStatus ?? {})).toHaveLength(1)
    expect((await loanAfter(second.id)).status).toBe('refused')
  })
})

describe('the read-time safety net on the surfaces that show pickup state (#153)', () => {
  it("expires the member's lapsed window while they open their dashboard", async () => {
    sendEmailSpy()
    const book = await createTestBook(payload)
    const loan = await lapsedLoan(book.id)

    const { getProfileDashboardData } = await import('@/features/profile/server/dashboard')
    const { makeAuthHeaders, setNextHeaders } = await import('../lib/next-stubs')
    const { loginToken } = await import('../lib/seed')
    const { token } = await loginToken(payload, {
      email: member.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const data = await getProfileDashboardData()

    expect(data).toBeTruthy()
    expect((await loanAfter(loan.id)).status).toBe('refused')
    expect((await memberAfter()).noShowCount).toBe(1)
    // The list they are looking at no longer carries a live accepted loan.
    const shown = data?.loans.find((row) => row.id === loan.id)
    expect(shown?.status).toBe('refused')
  })
})
