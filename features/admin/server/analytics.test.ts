import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))

const { getAdminAnalytics } = await import('./analytics')

describe('getAdminAnalytics', () => {
  beforeEach(() => getAdminCtx.mockReset())

  it('throws a clear error when the Payload adapter has no Postgres pool', async () => {
    getAdminCtx.mockResolvedValue({ payload: { db: {} }, user: { id: 1 } })
    await expect(getAdminAnalytics()).rejects.toThrow('تتطلب الإحصائيات قاعدة بيانات بوستغرس')
  })

  it('defaults the range to the start of this year and returns all aggregations', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ category: 'religious', requests: 2 }] })
      .mockResolvedValueOnce({ rows: [{ type: 'fiqh', requests: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            bookId: 1,
            title: 'Book',
            author: 'Author',
            publisher: null,
            category: 'religious',
            requests: 2,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ day: new Date('2026-01-02'), requests: 2 }] })
    getAdminCtx.mockResolvedValue({ payload: { db: { pool: { query } } }, user: { id: 1 } })
    const result = await getAdminAnalytics()
    expect(result.from).toBe(new Date(new Date().getFullYear(), 0, 1).toISOString())
    expect(result.topCategories).toEqual([{ category: 'religious', requests: 2 }])
    expect(result.topTypes).toEqual([{ type: 'fiqh', requests: 2 }])
    expect(result.topRequestedBooks[0].bookId).toBe(1)
    expect(result.busiestDays[0].requests).toBe(2)
    expect(query).toHaveBeenCalledTimes(4)
    expect(query.mock.calls[0][1]).toEqual([result.from])
  })
})
