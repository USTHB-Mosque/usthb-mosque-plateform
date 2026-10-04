import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const writeLog = vi.fn()
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))

const { getReviewKpis, getAdminReviews, deleteReview, copyReview } = await import('./reviews')
const user = { id: 1, role: 'admin' }

/** The single aggregate the review KPIs read: counts stay in Payload, averages need SQL. */
function kpiPayload(rows: Array<Record<string, unknown>>) {
  return { query: vi.fn().mockResolvedValue({ rows }) }
}

describe('admin reviews actions', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    writeLog.mockReset()
    revalidatePath.mockReset()
  })

  it('handles an empty review set and calculates non-empty percentages', async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce({ totalDocs: 0 })
      .mockResolvedValueOnce({ totalDocs: 0 })
      .mockResolvedValueOnce({ totalDocs: 0 })
      .mockResolvedValueOnce({ totalDocs: 0 })
    getAdminCtx.mockResolvedValue({
      payload: { count, db: { pool: kpiPayload([{ average: null }]) } },
      user,
    })
    await expect(getReviewKpis()).resolves.toMatchObject({
      positivePercent: 0,
      negativePercent: 0,
      averageRating: 0,
      bookAverageRating: 0,
      articleAverageRating: 0,
    })

    count.mockReset()
    count
      .mockResolvedValueOnce({ totalDocs: 10 })
      .mockResolvedValueOnce({ totalDocs: 6 })
      .mockResolvedValueOnce({ totalDocs: 4 })
      .mockResolvedValueOnce({ totalDocs: 8 })
    getAdminCtx.mockResolvedValue({
      payload: {
        count,
        db: {
          pool: kpiPayload([
            {
              average: '4.25',
              book_reviews: 7,
              book_average: '3.86',
              article_reviews: 3,
              article_average: '5.00',
            },
          ]),
        },
      },
      user,
    })
    await expect(getReviewKpis()).resolves.toMatchObject({
      positivePercent: 75,
      negativePercent: 50,
      // #156: an average per category, not just totals and sentiment.
      averageRating: 4.25,
      bookReviews: 7,
      bookAverageRating: 3.86,
      articleReviews: 3,
      articleAverageRating: 5,
    })
  })

  it('queries review targets as book, article, or all with default/explicit pagination', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    getAdminCtx.mockResolvedValue({ payload: { find }, user })
    await getAdminReviews()
    expect(find.mock.calls[0][0]).toMatchObject({ where: {}, page: 1, limit: 20 })
    await getAdminReviews({ targetType: 'book', page: 2, limit: 5 })
    expect(find.mock.calls[1][0]).toMatchObject({
      where: { book: { exists: true } },
      page: 2,
      limit: 5,
    })
    await getAdminReviews({ targetType: 'article' })
    expect(find.mock.calls[2][0]).toMatchObject({ where: { article: { exists: true } } })
  })

  it('deletes book and article reviews and logs the matching target label', async () => {
    const findByID = vi
      .fn()
      .mockResolvedValueOnce({ book: 12, rating: 5 })
      .mockResolvedValueOnce({ article: 7, rating: 2 })
    const del = vi.fn().mockResolvedValue({})
    const payload = { findByID, delete: del }
    getAdminCtx.mockResolvedValue({ payload, user, req: {} })
    await expect(deleteReview('1')).resolves.toEqual({ ok: true })
    await expect(deleteReview('2')).resolves.toEqual({ ok: true })
    expect(writeLog.mock.calls[0][2]).toMatchObject({
      targetType: 'book',
      message: expect.stringContaining('كتاب'),
    })
    expect(writeLog.mock.calls[1][2]).toMatchObject({
      targetType: 'article',
      message: expect.stringContaining('مقال'),
    })
    expect(del).toHaveBeenCalledTimes(2)
  })

  it('copies a review onto the same target under the admin and logs it', async () => {
    const findByID = vi
      .fn()
      .mockResolvedValueOnce({ id: 3, book: 12, rating: 5, comment: 'ممتاز' })
      .mockResolvedValueOnce({ id: 4, article: 7, rating: 1 })
    const create = vi.fn().mockResolvedValue({ id: 11 })
    getAdminCtx.mockResolvedValue({ payload: { findByID, create }, user, req: {} })

    await expect(copyReview(3)).resolves.toEqual({ ok: true, reviewId: 11 })
    expect(create).toHaveBeenCalledWith({
      collection: 'reviews',
      data: { book: 12, rating: 5, comment: 'ممتاز', user: user.id },
      overrideAccess: false,
      user,
      req: {},
    })

    await expect(copyReview(4)).resolves.toEqual({ ok: true, reviewId: 11 })
    expect(create.mock.calls[1][0].data).toEqual({ article: 7, rating: 1, user: user.id })

    expect(writeLog.mock.calls[0][2]).toMatchObject({
      action: 'review_copied',
      targetType: 'book',
      targetId: 12,
    })
    expect(writeLog.mock.calls[1][2]).toMatchObject({
      action: 'review_copied',
      targetType: 'article',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/reviews')
  })

  it('reports a copy that could not be made instead of failing silently', async () => {
    getAdminCtx.mockResolvedValue({
      payload: {
        findByID: vi.fn().mockResolvedValue({ id: 3, book: 12, rating: 5 }),
        create: vi.fn().mockRejectedValue(new Error('قاعدة البيانات غير متاحة')),
      },
      user,
      req: {},
    })

    await expect(copyReview(3)).resolves.toEqual({ ok: false, error: 'تعذر نسخ التقييم' })
    expect(writeLog).not.toHaveBeenCalled()
  })
})
