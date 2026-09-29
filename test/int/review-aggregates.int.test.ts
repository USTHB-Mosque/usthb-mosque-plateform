import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser } from '../lib/seed'
import { createTestArticle, createTestBook } from '../lib/factories'

import type { Payload } from 'payload'
import { RATING_AGGREGATE_PRECISION, SKIP_REVIEW_AGGREGATE } from '@/utils/constants/reviews'
import type { User } from '@/payload-types'

// The aggregate a review's target reports (#25). Recomputed from the real rows
// on every create, update and delete, for whichever target the review names.
let payload: Payload
let member: User
let admin: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  member = await createTestUser(payload, { verified: true })
  admin = await createTestUser(payload, { role: 'admin' })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

const aggregates = async (collection: 'books' | 'articles', id: number) => {
  const doc = await payload.findByID({ collection, id, overrideAccess: true, depth: 0 })
  return { ratingCount: doc.ratingCount, averageRating: doc.averageRating }
}

describe('review aggregates on an article target (#103)', () => {
  it('maintains the article aggregate across create, update and delete', async () => {
    const article = await createTestArticle(payload)
    const adminReq = await boundReq(payload, admin)

    const first = await payload.create({
      collection: 'reviews',
      data: { user: member.id, article: article.id, rating: 5, comment: 'ممتاز' },
      overrideAccess: true,
    })
    expect(await aggregates('articles', article.id)).toEqual({
      ratingCount: 1,
      averageRating: 5,
    })

    await payload.create({
      collection: 'reviews',
      data: { user: admin.id, article: article.id, rating: 2, comment: 'ضعيف' },
      overrideAccess: true,
    })
    expect(await aggregates('articles', article.id)).toEqual({
      ratingCount: 2,
      averageRating: 3.5,
    })

    await payload.update({
      collection: 'reviews',
      id: first.id,
      data: { rating: 4 },
      req: adminReq,
      overrideAccess: false,
    })
    expect(await aggregates('articles', article.id)).toEqual({
      ratingCount: 2,
      averageRating: 3,
    })

    await payload.delete({
      collection: 'reviews',
      id: first.id,
      req: adminReq,
      overrideAccess: false,
    })
    expect(await aggregates('articles', article.id)).toEqual({
      ratingCount: 1,
      averageRating: 2,
    })
  })

  it('leaves an article with no reviews at zero', async () => {
    const article = await createTestArticle(payload)
    const review = await payload.create({
      collection: 'reviews',
      data: { user: member.id, article: article.id, rating: 4, comment: 'جيد' },
      overrideAccess: true,
    })

    await payload.delete({
      collection: 'reviews',
      id: review.id,
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })

    expect(await aggregates('articles', article.id)).toEqual({
      ratingCount: 0,
      averageRating: 0,
    })
  })
})

describe('review aggregates over more rows than one page', () => {
  it('averages every review, not a capped read', async () => {
    const book = await createTestBook(payload)
    // 12 rows, one more than a default page: a capped read would report 10 and
    // a mean over the wrong set.
    const ratings = [5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4]
    for (const [index, rating] of ratings.entries()) {
      await payload.create({
        collection: 'reviews',
        data: { user: member.id, book: book.id, rating, comment: `مراجعة ${index}` },
        overrideAccess: true,
      })
    }

    const sum = ratings.reduce((a, b) => a + b, 0)
    const scale = 10 ** RATING_AGGREGATE_PRECISION
    expect(await aggregates('books', book.id)).toEqual({
      ratingCount: 12,
      averageRating: Math.round((sum / 12) * scale) / scale,
    })
  })
})

describe('review aggregates when a review changes target', () => {
  it('recomputes both the target it left and the one it joined', async () => {
    const book = await createTestBook(payload)
    const article = await createTestArticle(payload)

    const kept = await payload.create({
      collection: 'reviews',
      data: { user: admin.id, book: book.id, rating: 4, comment: 'بقي على الكتاب' },
      overrideAccess: true,
    })
    const moved = await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 2, comment: 'انتقل' },
      overrideAccess: true,
    })
    expect(await aggregates('books', book.id)).toEqual({ ratingCount: 2, averageRating: 3 })

    // Re-point the review at the article. The book loses a row, so its
    // aggregate has to follow or it keeps counting a review that left.
    await payload.update({
      collection: 'reviews',
      id: moved.id,
      data: { book: null, article: article.id },
      req: await boundReq(payload, admin),
      overrideAccess: false,
    })

    expect(await aggregates('books', book.id)).toEqual({ ratingCount: 1, averageRating: 4 })
    expect(await aggregates('articles', article.id)).toEqual({ ratingCount: 1, averageRating: 2 })
    expect(kept.id).not.toBe(moved.id)
  })
})

describe('review aggregate re-entrancy guard', () => {
  it('skips the recompute when the caller asked for it', async () => {
    const book = await createTestBook(payload)
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { ratingCount: 99, averageRating: 1 },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 5, comment: 'محسوب مسبقاً' },
      overrideAccess: true,
      context: { [SKIP_REVIEW_AGGREGATE]: true },
    })

    // Left exactly as the caller set it: the guard is a bulk-caller opt-out,
    // not a recompute that quietly ran anyway.
    expect(await aggregates('books', book.id)).toEqual({ ratingCount: 99, averageRating: 1 })
  })

  it('skips the recompute on delete too, so a bulk rewrite is not O(n) reads', async () => {
    const book = await createTestBook(payload)
    const review = await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 5, comment: 'مراجع' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { ratingCount: 42, averageRating: 3 },
      overrideAccess: true,
    })

    await payload.delete({
      collection: 'reviews',
      id: review.id,
      req: await boundReq(payload, admin),
      overrideAccess: false,
      context: { [SKIP_REVIEW_AGGREGATE]: true },
    })

    expect(await aggregates('books', book.id)).toEqual({ ratingCount: 42, averageRating: 3 })
  })
})
