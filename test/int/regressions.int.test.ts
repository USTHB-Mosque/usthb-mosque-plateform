import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor } from '../lib/seed'
import { createTestBook } from '../lib/factories'
import { clearNextContext } from '../lib/next-stubs'

import type { Payload } from 'payload'
import { borrowBookLogic } from '@/features/library/server/borrow-book'
import type { User } from '@/payload-types'

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
  // RED until #19: flip `it.fails` to `it` when the release hook exists.
  it.fails('returns the copy to availableBooks exactly once', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })
    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    expect(result.success).toBe(true)
    const loanId = (result.loan as { id: number }).id

    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'returned', returnDate: new Date().toISOString() },
      req: await boundReq(payload, admin),
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
  // RED until #19: flip `it.fails` to `it` when overdue marking exists.
  it.fails('reports a loan past its dueDate as overdue', async () => {
    const book = await createTestBook(payload)
    const result = await borrowBookLogic(String(book.id), await ctxFor(payload, member))
    const loanId = (result.loan as { id: number }).id

    // Backdate the loan past its due date, then read it back: an overdue loan
    // must never be presented as on-time. #19 decides between a lazy check on
    // read and a scheduled job; whichever it picks must satisfy this read.
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await payload.update({
      collection: 'loans',
      id: loanId,
      data: { dueDate: past.toISOString() },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })

    const readBack = await payload.findByID({
      collection: 'loans',
      id: loanId,
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })
    expect(readBack.status).toBe('overdue')
  })
})
