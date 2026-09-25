import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestArticle, createTestBook, createTestReview } from '../lib/factories'
import { createTestLoan } from '../lib/factories'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { getAdminAnalytics } from '@/features/admin/server/analytics'
import { deleteReview, getAdminReviews, getReviewKpis } from '@/features/admin/server/reviews'
import { getAdminLogs } from '@/features/admin/server/logs'
import { LogAction } from '@/features/admin/server/logs-core'

let payload: Payload
let admin: User
let member: User

async function loginAs(user: User, password = 'correct horse battery') {
  const { token } = await loginToken(payload, { email: user.email ?? '', password })
  setNextHeaders(makeAuthHeaders(token))
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  admin = await createTestUser(payload, {
    role: 'admin',
    email: 'admin@reviews-logs-int.usthb.dz',
    verified: true,
  })
  member = await createTestUser(payload, {
    email: 'member@reviews-logs-int.usthb.dz',
    verified: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('admin reviews (#103)', () => {
  it('refuses non-admin access and computes review KPIs from seeded reviews', async () => {
    await loginAs(member)
    await expect(getReviewKpis()).rejects.toThrow('Unauthorized')

    await loginAs(admin)
    const book = await createTestBook(payload)
    const article = await createTestArticle(payload)
    for (const rating of [5, 4, 2, 1, 3]) {
      await createTestReview(payload, {
        user: member.id,
        book: book.id,
        rating,
        comment: `تقييم ${rating}`,
      })
    }
    await payload.create({
      collection: 'reviews',
      data: { user: member.id, article: article.id, rating: 5, comment: 'مقال نافع' },
      overrideAccess: true,
    })

    await expect(getReviewKpis()).resolves.toMatchObject({
      totalReviews: 6,
      positiveReviews: 3,
      negativeReviews: 2,
      positivePercent: 60,
      negativePercent: 40,
    })
    await expect(getAdminReviews({ targetType: 'article' })).resolves.toMatchObject({
      docs: [expect.objectContaining({ article: expect.anything() })],
      totalDocs: 1,
    })
    await expect(getAdminReviews({ targetType: 'book' })).resolves.toMatchObject({
      totalDocs: 5,
    })
  })

  it('deletes a review and records the admin action in the append-only event log', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload)
    const review = await createTestReview(payload, {
      user: member.id,
      book: book.id,
      rating: 4,
    })

    await expect(deleteReview(review.id)).resolves.toEqual({ ok: true })
    const result = await payload.find({
      collection: 'logs',
      where: { action: { equals: LogAction.ReviewDeleted } },
      overrideAccess: true,
    })
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]).toMatchObject({
      targetType: 'book',
      targetId: String(book.id),
    })
    expect(typeof result.docs[0].actor === 'object' && result.docs[0].actor?.id).toBe(admin.id)
  })
})

describe('admin event log (#103)', () => {
  it('filters logs by actor, action, and date range and groups results by day', async () => {
    await loginAs(admin)
    const now = new Date()
    const old = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000)
    for (const [actor, action, timestamp] of [
      [admin.id, LogAction.BookCreated, now],
      [admin.id, LogAction.BookUpdated, now],
      [member.id, LogAction.BookCreated, now],
      [admin.id, LogAction.BookCreated, old],
    ] as const) {
      await payload.create({
        collection: 'logs',
        data: {
          actor,
          action,
          targetType: 'book',
          targetId: '1',
          timestamp: timestamp.toISOString(),
          message: action,
        },
        overrideAccess: true,
      })
    }

    const result = await getAdminLogs({
      actor: admin.id,
      action: LogAction.BookCreated,
      from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    })
    expect(result.logs).toHaveLength(1)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].items).toHaveLength(1)
  })
})

describe('admin analytics (#103)', () => {
  it('aggregates loan requests by category, book type, requested book, and day', async () => {
    await loginAs(admin)
    const aqidahBook = await createTestBook(payload, { title: 'كتاب العقيدة' })
    const fiqhBook = await createTestBook(payload, { title: 'كتاب الفقه' })
    await payload.update({
      collection: 'books',
      id: fiqhBook.id,
      data: { category: 'scientific', type: ['fiqh'] },
      overrideAccess: true,
    })
    const recent = new Date()
    recent.setUTCHours(0, 0, 0, 0)
    const from = new Date(recent.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    await createTestLoan(payload, {
      book: aqidahBook.id,
      user: member.id,
      status: 'pending',
      loanDate: recent.toISOString(),
    })
    await createTestLoan(payload, {
      book: aqidahBook.id,
      user: member.id,
      status: 'refused',
      loanDate: recent.toISOString(),
    })
    await createTestLoan(payload, {
      book: fiqhBook.id,
      user: member.id,
      status: 'pending',
      loanDate: recent.toISOString(),
    })

    const result = await getAdminAnalytics({ from })
    expect(result.topCategories).toEqual(
      expect.arrayContaining([
        { category: 'religious', requests: 2 },
        { category: 'scientific', requests: 1 },
      ]),
    )
    expect(result.topTypes).toEqual(
      expect.arrayContaining([
        { type: 'aqidah', requests: 2 },
        { type: 'fiqh', requests: 1 },
      ]),
    )
    expect(result.topRequestedBooks[0]).toMatchObject({
      bookId: aqidahBook.id,
      title: 'كتاب العقيدة',
      requests: 2,
    })
    expect(result.busiestDays).toHaveLength(1)
    expect(result.busiestDays[0].requests).toBe(3)
  })
})
