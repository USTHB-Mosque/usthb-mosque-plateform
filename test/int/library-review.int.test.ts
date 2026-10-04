import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, boundReq } from '../setup-integration'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { createTestBook } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import { reviewBook, reviewBookLogic } from '@/features/library/server/review-book'
import type { User } from '@/payload-types'

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

describe('reviewBookLogic', () => {
  it('creates the review as the caller', async () => {
    const book = await createTestBook(payload)

    const review = await reviewBookLogic(
      { bookId: book.id, rating: 4, comment: 'Excellent livre' },
      await ctxFor(payload, member),
    )

    expect((review.user as User).id).toBe(member.id)
    expect((review.book as unknown as { id: number }).id).toBe(book.id)
    expect(review.rating).toBe(4)
    expect(review.comment).toBe('Excellent livre')
  })

  it('rejects a missing rating', async () => {
    const book = await createTestBook(payload)

    await expect(
      reviewBookLogic(
        { bookId: book.id, rating: 0, comment: 'no rating' },
        await ctxFor(payload, member),
      ),
    ).rejects.toThrow('Please provide a rating and comment')
  })

  it('rejects a missing comment', async () => {
    const book = await createTestBook(payload)

    await expect(
      reviewBookLogic({ bookId: book.id, rating: 5, comment: '' }, await ctxFor(payload, member)),
    ).rejects.toThrow('Please provide a rating and comment')
  })
})

describe('reviewBook (wrapper)', () => {
  it('rejects anonymous callers', async () => {
    await expect(reviewBook(1, 5, 'comment')).rejects.toThrow('You must be logged in')
  })

  it('creates as the cookie user', async () => {
    const book = await createTestBook(payload)
    const { token } = await loginToken(payload, {
      email: member.email!,
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    const review = await reviewBook(book.id, 3, 'cookie review')

    expect((review.user as User).id).toBe(member.id)
  })
})

describe('review access', () => {
  it('lets any member create a review but forbids the owner from updating or deleting it', async () => {
    const book = await createTestBook(payload)
    const req = await boundReq(payload, member)

    const review = await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 3, comment: 'ok' },
      req,
      overrideAccess: false,
    })

    await expect(
      payload.update({
        collection: 'reviews',
        id: review.id,
        data: { rating: 4 },
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow('You are not allowed to perform this action.')

    await expect(
      payload.delete({
        collection: 'reviews',
        id: review.id,
        req,
        overrideAccess: false,
      }),
    ).rejects.toThrow('You are not allowed to perform this action.')
  })
})
