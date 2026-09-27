import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
vi.mock('./ctx', () => ({ getAdminCtx: (...args: unknown[]) => getAdminCtx(...args) }))

const { getAdminDashboardStats } = await import('./dashboard')

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

/**
 * Keyed off the collection and the predicate rather than call order: the
 * dashboard fires four separate `loans` finds, and a positional queue silently
 * mis-assigns results the moment a query is added or reordered.
 */
const find = vi.fn(async (args: { collection: string; where?: Record<string, unknown> }) => {
  const { collection, where } = args
  if (collection === 'users') return { docs: recentUsers }
  if (collection === 'reviews') return { docs: [] }
  if (collection === 'loan-extensions') return { totalDocs: 2, docs: [] }

  // The dashboard fires four separate `loans` finds; tell them apart by
  // predicate rather than by call order.
  const and = where?.and as Array<Record<string, any>> | undefined
  const status = (and?.[0]?.status ?? where?.status) as
    { equals?: string; in?: string[] } | undefined

  // pending requests feed the stat card; accepted feeds the pickups table.
  if (status?.equals === 'pending') return { totalDocs: 1, docs: [] }
  if (status?.equals === 'accepted') return { totalDocs: 0, docs: [{ id: 7, pickupCode: 'PK-1' }] }
  if (status?.in) {
    // Overdue and upcoming returns both filter by status; the due-date
    // comparison tells them apart (less_than = overdue, greater_than = returns).
    return and?.[1]?.dueDate?.less_than ? { totalDocs: 3, docs: [] } : { docs: [] }
  }
  return { totalDocs: 0, docs: [] }
})

const count = vi.fn().mockResolvedValue({ totalDocs: 4 })

describe('getAdminDashboardStats', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    find.mockClear()
    getAdminCtx.mockResolvedValue({ payload: { find, count }, user: { id: 1 } })
  })

  it('flattens recent activity, selects fallback names, sorts newest-first, and skips users without logs', async () => {
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

  it('returns the six soonest accepted loans that have a pickup date', async () => {
    const result = await getAdminDashboardStats()

    expect(result.upcomingPickups).toEqual([{ id: 7, pickupCode: 'PK-1' }])

    const pickupQuery = find.mock.calls
      .map(
        ([args]) => args as { collection: string; where?: unknown; sort?: string; limit?: number },
      )
      .find((args) => {
        const where = args.where as { and?: Array<{ pickupDate?: unknown }> } | undefined
        return where?.and?.some((clause) => clause.pickupDate !== undefined)
      })

    expect(pickupQuery).toMatchObject({
      collection: 'loans',
      sort: 'pickupDate',
      limit: 6,
    })
    expect((pickupQuery?.where as any).and[0]).toEqual({ status: { equals: 'accepted' } })
  })
})
