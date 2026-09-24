import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor } from '../lib/seed'
import { createTestBook } from '../lib/factories'
import { clearNextContext } from '../lib/next-stubs'

import type { Payload } from 'payload'
import { borrowBookLogic } from '@/features/library/server/borrow-book'
import { getEffectiveLoanStatus } from '@/features/library/components/LoanStatusBadge'
import type { Loan, User } from '@/payload-types'

// Regression tests for the three defects found on 2026-09-05. They are written
// red: #19 (loan lifecycle) and #25 (rating recompute) turn them green. Each
// test is marked `it.fails`, so the suite stays green until then — and when a
// fix lands, `it.fails` itself fails and must be flipped to `it`.

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

describe('defect: marking a loan returned does not give the copy back', () => {
  // Fixed in #19: the loan lifecycle hook releases the copy whenever a loan
  // that held one stops holding it.
  it('returns the copy to availableBooks exactly once', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })
    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(result.success).toBe(true)
    const loanId = (result.loan as { id: number }).id

    // Under the new model a pending loan holds nothing: take it through the
    // real lifecycle first so the return has a copy to give back.
    const adminReq = await boundReq(payload, admin)
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'accepted' },
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'picked_up' },
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })
    const held = await payload.findByID({
      collection: 'books',
      id: book.id,
      overrideAccess: true,
      depth: 0,
    })
    expect(held.availableBooks).toBe(2)

    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'returned', returnDate: new Date().toISOString() },
      req: adminReq,
      overrideAccess: false,
    })

    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.availableBooks).toBe(3)
  })
})

describe('defect: averageRating and ratingCount are never recalculated', () => {
  // RED until #25: flip `it.fails` to `it` when the recompute hooks exist.
  it.fails('recomputes the aggregates when reviews are created', async () => {
    const book = await createTestBook(payload)

    await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 3, comment: 'decent' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'reviews',
      data: { user: admin.id, book: book.id, rating: 5, comment: 'great' },
      overrideAccess: true,
    })

    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.ratingCount).toBe(2)
    expect(after.averageRating).toBe(4)
  })

  it.fails('recomputes the aggregates when a review is updated', async () => {
    const book = await createTestBook(payload)
    const review = await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 3, comment: 'ok' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'reviews',
      data: { user: admin.id, book: book.id, rating: 5, comment: 'great' },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'reviews',
      id: review.id,
      data: { rating: 5 },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })

    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.ratingCount).toBe(2)
    expect(after.averageRating).toBe(5)
  })

  // RED until #25: the stale seeded aggregates must not survive the delete.
  it.fails('recomputes the aggregates when a review is deleted', async () => {
    // Seed stale aggregates so the delete cannot pass vacuously: today the
    // hook-less book keeps reporting the fiction the seed wrote.
    const book = await createTestBook(payload)
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { ratingCount: 1, averageRating: 5 },
      overrideAccess: true,
    })
    const review = await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 5, comment: 'great' },
      overrideAccess: true,
    })

    await payload.delete({
      collection: 'reviews',
      id: review.id,
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })

    const after = await payload.findByID({ collection: 'books', id: book.id, overrideAccess: true })
    expect(after.ratingCount).toBe(0)
    expect(after.averageRating).toBe(0)
  })
})

describe('defect: nothing marks loans overdue', () => {
  // Fixed in #19: overdue is derived from dueDate — decided as a lazy check on
  // read (no scheduled job). The stored status stays picked_up; the effective
  // status a reader must see is overdue.
  it('reports a loan past its dueDate as overdue', async () => {
    const book = await createTestBook(payload)
    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    const loanId = (result.loan as { id: number }).id
    const adminReq = await boundReq(payload, admin)

    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'accepted' },
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'picked_up' },
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })

    // Backdate the loan past its due date, then read it back: an overdue loan
    // must never be presented as on-time.
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { dueDate: past.toISOString() },
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })

    const readBack = await payload.findByID({
      collection: 'loans',
      id: loanId,
      req: adminReq,
      overrideAccess: false,
      depth: 0,
    })
    // Not stored: the five-state model has no overdue status. The effective
    // (derived) status is what every consumer must read through.
    expect(readBack.status).toBe('picked_up')
    expect(getEffectiveLoanStatus(readBack as Loan)).toBe('overdue')
  })
})
