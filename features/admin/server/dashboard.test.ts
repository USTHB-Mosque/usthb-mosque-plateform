import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))

const { getAdminDashboardStats } = await import('./dashboard')

describe('getAdminDashboardStats', () => {
  beforeEach(() => getAdminCtx.mockReset())

  it('flattens recent activity, selects fallback names, sorts newest-first, and skips users without logs', async () => {
    const recentUsers = [
      {
        fullName: 'Full Name',
        email: 'full@example.com',
        activityLog: [{ action: 'a', timestamp: '2026-01-02T10:00:00Z' }],
      },
      {
        firstName: 'First',
        lastName: 'Last',
        email: 'first@example.com',
        activityLog: [{ action: 'b', timestamp: '2026-01-03T10:00:00Z' }],
      },
      {
        firstName: '',
        lastName: '',
        email: 'email@example.com',
        activityLog: [{ action: 'c', timestamp: '2026-01-01T10:00:00Z' }],
      },
      { email: 'empty@example.com' },
    ]
    const find = vi
      .fn()
      .mockResolvedValueOnce({ totalDocs: 1, docs: [] })
      .mockResolvedValueOnce({ totalDocs: 2, docs: [] })
      .mockResolvedValueOnce({ totalDocs: 3, docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: recentUsers })
    const count = vi.fn().mockResolvedValue({ totalDocs: 4 })
    getAdminCtx.mockResolvedValue({ payload: { find, count }, user: { id: 1 } })

    const result = await getAdminDashboardStats()
    expect(result.stats).toEqual({
      pendingLoans: 1,
      pendingExtensions: 2,
      severeOverdue: 3,
      pendingVerifications: 4,
    })
    expect(result.recentActivityLogs.map((entry) => entry.userName)).toEqual([
      'First Last',
      'Full Name',
      'email@example.com',
    ])
    expect(result.recentActivityLogs.map((entry) => entry.action)).toEqual(['b', 'a', 'c'])
    expect(result.recentActivityLogs[2].userEmail).toBe('email@example.com')
  })
})
