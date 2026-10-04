import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))

const { getAdminAnalytics } = await import('./analytics')

/** One resolved `rows` value per query the analytics screen issues, in order. */
const emptyRows = () => ({ rows: [] })

describe('getAdminAnalytics', () => {
  beforeEach(() => getAdminCtx.mockReset())

  it('throws a clear error when the Payload adapter has no Postgres pool', async () => {
    getAdminCtx.mockResolvedValue({ payload: { db: {} }, user: { id: 1 } })
    await expect(getAdminAnalytics()).rejects.toThrow('تتطلب الإحصائيات قاعدة بيانات بوستغرس')
  })

  it('defaults the range to the start of this year and returns all aggregations', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(emptyRows())
      .mockResolvedValueOnce(emptyRows())
      .mockResolvedValueOnce(emptyRows())
      .mockResolvedValueOnce(emptyRows())
      .mockResolvedValueOnce({ rows: [{ month: new Date('2026-02-01'), loans: 7 }] })
      .mockResolvedValueOnce({ rows: [{ hour: 10, requests: 5 }] })
      .mockResolvedValueOnce({ rows: [{ weekday: 3, requests: 9 }] })
      .mockResolvedValueOnce({ rows: [{ hour: 9, pickups: 4 }] })
      .mockResolvedValueOnce({ rows: [{ weekday: 4, pickups: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            title: 'مقال',
            type: 'aqiyah',
            reads: 4,
            reviews: 1,
            favorites: 0,
            interactions: 5,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ activityId: 2, title: 'نشاط', registrations: 3 }] })
      .mockResolvedValueOnce({ rows: [{ activityId: 2, title: 'نشاط', positive: 2, negative: 1 }] })

    getAdminCtx.mockResolvedValue({ payload: { db: { pool: { query } } }, user: { id: 1 } })
    const result = await getAdminAnalytics()

    expect(result.from).toBe(new Date(new Date().getFullYear(), 0, 1).toISOString())
    expect(result.monthlyBorrowings[0].loans).toBe(7)
    expect(result.busiestHours).toEqual([{ hour: 10, requests: 5 }])
    expect(result.busiestWeekdays).toEqual([{ weekday: 3, requests: 9 }])
    expect(result.pickupHours).toEqual([{ hour: 9, pickups: 4 }])
    expect(result.pickupWeekdays).toEqual([{ weekday: 4, pickups: 2 }])
    expect(result.topArticleByInteraction).toMatchObject({ title: 'مقال', interactions: 5 })
    expect(result.activityRegistrations[0].registrations).toBe(3)
    expect(result.activityFeedback[0]).toEqual({
      activityId: 2,
      title: 'نشاط',
      positive: 2,
      negative: 1,
    })
    expect(query).toHaveBeenCalledTimes(12)
  })

  it('passes the requested range to every loan and activity query', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      // The article engagement table is all-time on purpose: reads are a
      // cumulative counter and cannot be split across periods honestly.
      if (sql.includes('article_reads')) return emptyRows()
      return emptyRows()
    })
    getAdminCtx.mockResolvedValue({ payload: { db: { pool: { query } } }, user: { id: 1 } })

    const from = new Date('2026-03-01T00:00:00.000Z').toISOString()
    const result = await getAdminAnalytics({ from })

    expect(result.from).toBe(from)
    const periodScoped = query.mock.calls.filter((call) => typeof call[1] === 'object')
    expect(periodScoped.length).toBe(11)
    for (const call of periodScoped) {
      expect(call[1]).toEqual([from])
    }
    expect(query.mock.calls.filter((call) => call[1] === undefined).length).toBe(1)
  })

  it('asks the database for the shapes the charts need', async () => {
    const query = vi.fn().mockResolvedValue(emptyRows())
    getAdminCtx.mockResolvedValue({ payload: { db: { pool: { query } } }, user: { id: 1 } })

    await getAdminAnalytics()

    const sql = query.mock.calls.map((call) => call[0] as string)
    expect(sql[3]).toContain("l.status IN ('picked_up', 'returned')")
    expect(sql[4]).toContain("date_trunc('month'")
    expect(sql[5]).toContain("AT TIME ZONE 'Africa/Algiers'")
    expect(sql[5]).toContain('BETWEEN 8 AND 17')
    expect(sql[6]).toContain('ISODOW')
    expect(sql[7]).toContain('l.pickup_date')
    expect(sql[8]).toContain('l.pickup_date')
    expect(sql[9]).toContain('article_reads')
  })

  it('returns a null top article when nothing has been read', async () => {
    const query = vi.fn().mockResolvedValue(emptyRows())
    getAdminCtx.mockResolvedValue({ payload: { db: { pool: { query } } }, user: { id: 1 } })

    const result = await getAdminAnalytics()
    expect(result.topArticleByInteraction).toBeNull()
    expect(result.articleEngagement).toEqual([])
  })
})
