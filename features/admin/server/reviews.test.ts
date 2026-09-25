import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const writeLog = vi.fn()
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))

const { getReviewKpis, getAdminReviews, deleteReview } = await import('./reviews')
const user = { id: 1, role: 'admin' }

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
    getAdminCtx.mockResolvedValue({ payload: { count }, user })
    await expect(getReviewKpis()).resolves.toMatchObject({
      positivePercent: 0,
      negativePercent: 0,
    })

    count.mockReset()
    count
      .mockResolvedValueOnce({ totalDocs: 10 })
      .mockResolvedValueOnce({ totalDocs: 6 })
      .mockResolvedValueOnce({ totalDocs: 4 })
      .mockResolvedValueOnce({ totalDocs: 8 })
    await expect(getReviewKpis()).resolves.toMatchObject({
      positivePercent: 75,
      negativePercent: 50,
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
})
