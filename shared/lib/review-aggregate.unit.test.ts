import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

import {
  maintainReviewAggregates,
  recomputeTargetAggregate,
  resolveReviewTarget,
} from './review-aggregate'
import { SKIP_REVIEW_AGGREGATE } from '@/utils/constants/reviews'

function fakeReq(docs: { rating?: number | null }[]) {
  const update = vi.fn(async () => {
    // The write runs while the guard is set, and only while it is set.
    expect(req.context[SKIP_REVIEW_AGGREGATE]).toBe(true)
  })
  const req = {
    context: {},
    payload: {
      find: vi.fn(async () => ({ docs })),
      update,
    },
  } as unknown as PayloadRequest
  return { req, update, find: req.payload.find as unknown as ReturnType<typeof vi.fn> }
}

const book = (id: number) => ({ field: 'book', collection: 'books', id }) as const
const article = (id: number) => ({ field: 'article', collection: 'articles', id }) as const

describe('resolveReviewTarget', () => {
  it('reads a book target from an id or a populated document', () => {
    expect(resolveReviewTarget({ book: 7 })).toEqual(book(7))
    expect(resolveReviewTarget({ book: { id: 7 } })).toEqual(book(7))
  })

  it('reads an article target from an id or a populated document', () => {
    expect(resolveReviewTarget({ article: 3 })).toEqual(article(3))
    expect(resolveReviewTarget({ article: { id: 3 } })).toEqual(article(3))
  })

  it('has no target for a missing or untargeted review', () => {
    expect(resolveReviewTarget(null)).toBeNull()
    expect(resolveReviewTarget(undefined)).toBeNull()
    expect(resolveReviewTarget({})).toBeNull()
  })
})

describe('recomputeTargetAggregate', () => {
  it('writes the count and the mean of the rows that exist', async () => {
    const { req, update } = fakeReq([{ rating: 3 }, { rating: 5 }])

    await recomputeTargetAggregate(req, book(7))

    expect(update).toHaveBeenCalledWith({
      collection: 'books',
      id: 7,
      data: { ratingCount: 2, averageRating: 4 },
      req,
      overrideAccess: true,
    })
  })

  it('rounds the mean to display precision', async () => {
    const { req, update } = fakeReq([{ rating: 5 }, { rating: 4 }, { rating: 4 }])

    await recomputeTargetAggregate(req, article(3))

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ratingCount: 3, averageRating: 4.33 } }),
    )
  })

  it('reads every row, uncapped, and ignores an absent rating', async () => {
    const { req, find } = fakeReq([{ rating: 5 }, { rating: null }, { rating: undefined }])

    await recomputeTargetAggregate(req, book(7))

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { book: { equals: 7 } }, limit: 0, depth: 0 }),
    )
    expect(req.context[SKIP_REVIEW_AGGREGATE]).toBeUndefined()
  })

  it('reports zero for both fields once the last review is gone', async () => {
    const { req, update } = fakeReq([])

    await recomputeTargetAggregate(req, book(7))

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ratingCount: 0, averageRating: 0 } }),
    )
  })

  it('clears the re-entrancy guard even when the write fails', async () => {
    const { req } = fakeReq([{ rating: 5 }])
    ;(req.payload.update as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('write failed'),
    )

    await expect(recomputeTargetAggregate(req, book(7))).rejects.toThrow('write failed')

    expect(req.context[SKIP_REVIEW_AGGREGATE]).toBeUndefined()
  })
})

describe('maintainReviewAggregates', () => {
  it('recomputes the single target a create touched', async () => {
    const { req, update } = fakeReq([{ rating: 4 }])

    await maintainReviewAggregates(req, { doc: { book: 7 } })

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ collection: 'books', id: 7 }))
  })

  it('recomputes once when an update kept the same target', async () => {
    const { req, update } = fakeReq([{ rating: 4 }])

    await maintainReviewAggregates(req, { doc: { book: 7 }, previousDoc: { book: 7 } })

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('recomputes both sides when a review changed target', async () => {
    const { req, update } = fakeReq([{ rating: 4 }])

    await maintainReviewAggregates(req, {
      doc: { article: 3 },
      previousDoc: { book: 7 },
    })

    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ collection: 'articles', id: 3 }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ collection: 'books', id: 7 }))
  })

  it('recomputes only the target it left when a review lost its target', async () => {
    const { req, update } = fakeReq([{ rating: 4 }])

    await maintainReviewAggregates(req, { doc: {}, previousDoc: { book: 7 } })

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ collection: 'books', id: 7 }))
  })

  it('writes nothing when neither side names a target', async () => {
    const { req, update } = fakeReq([{ rating: 4 }])

    await maintainReviewAggregates(req, { doc: {} })

    expect(update).not.toHaveBeenCalled()
  })
})
