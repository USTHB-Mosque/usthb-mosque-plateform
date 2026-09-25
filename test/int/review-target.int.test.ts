import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestArticle, createTestBook } from '../lib/factories'

let payload: Payload
let member: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  member = await payload.create({
    collection: 'users',
    data: {
      email: 'reviewer@target-int.usthb.dz',
      password: 'correct horse battery',
      fullName: 'Reviewer',
      role: 'user',
      verificationStatus: 'verified',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    },
    overrideAccess: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

function reviewData(extra: Record<string, unknown>) {
  return { user: member.id, rating: 4, comment: 'رأي صادق', ...extra }
}

describe('review exactly-one target rule (#103)', () => {
  it('accepts a book review', async () => {
    const book = await createTestBook(payload)
    const review = await payload.create({
      collection: 'reviews',
      data: reviewData({ book: book.id }),
      overrideAccess: true,
    })

    const fresh = await payload.findByID({
      collection: 'reviews',
      id: review.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(fresh.book).toBe(book.id)
    expect(fresh.article ?? null).toBeNull()
  })

  it('accepts an article review', async () => {
    const article = await createTestArticle(payload)
    const review = await payload.create({
      collection: 'reviews',
      data: reviewData({ article: article.id }),
      overrideAccess: true,
    })

    const fresh = await payload.findByID({
      collection: 'reviews',
      id: review.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(fresh.article).toBe(article.id)
    expect(fresh.book ?? null).toBeNull()
  })

  it('rejects a review targeting both book and article', async () => {
    const book = await createTestBook(payload)
    const article = await createTestArticle(payload)

    await expect(
      payload.create({
        collection: 'reviews',
        data: reviewData({ book: book.id, article: article.id }),
        overrideAccess: true,
      }),
    ).rejects.toThrow(/واحداً بالضبط/)
  })

  it('rejects a review targeting neither', async () => {
    await expect(
      payload.create({
        collection: 'reviews',
        data: reviewData({}),
        overrideAccess: true,
      }),
    ).rejects.toThrow(/واحداً بالضبط/)
  })
})
