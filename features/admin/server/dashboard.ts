'use server'

import { getAdminCtx } from './ctx'

/**
 * The dashboard shows a short, actionable slice of the pickup queue — the
 * members due to collect soonest. The full queue lives on the loans screen.
 */
const DASHBOARD_PICKUP_LIMIT = 6

export async function getAdminDashboardStats() {
  const { payload, user } = await getAdminCtx()

  const [
    pendingLoans,
    pendingExtensions,
    severeOverdue,
    pendingVerifications,
    upcomingReturns,
    upcomingPickups,
    latestReviews,
    recentUsers,
  ] = await Promise.all([
    // Pending loan requests
    payload.find({
      collection: 'loans',
      where: { status: { equals: 'pending' } },
      depth: 2,
      limit: 50,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    }),

    // Pending extension requests
    payload.find({
      collection: 'loan-extensions',
      where: { status: { equals: 'pending' } },
      depth: 2,
      limit: 50,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    }),

    // Severe overdue (dueDate more than 7 days ago; overdue is derived)
    payload.find({
      collection: 'loans',
      where: {
        and: [
          { status: { in: ['accepted', 'picked_up'] } },
          { dueDate: { less_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } },
        ],
      },
      depth: 2,
      limit: 50,
      sort: '-dueDate',
      overrideAccess: false,
      user,
    }),

    // Pending verifications count
    payload.count({
      collection: 'users',
      where: { verificationStatus: { equals: 'pending_verification' } },
      overrideAccess: false,
      user,
    }),

    // Upcoming book returns (physical copies out, dueDate in the future)
    payload.find({
      collection: 'loans',
      where: {
        and: [
          { status: { in: ['accepted', 'picked_up'] } },
          { dueDate: { greater_than: new Date().toISOString() } },
        ],
      },
      depth: 2,
      limit: 10,
      sort: 'dueDate',
      overrideAccess: false,
      user,
    }),

    // Upcoming pickups: copies reserved and waiting for the member to collect
    // them at the mosque. `accepted` is the only state that still holds a copy
    // the borrower has not taken yet, so a `picked_up` loan is deliberately
    // excluded. The pickup code and slot are stamped by the lifecycle hook on
    // the `accepted` transition (collections/Loan.ts).
    payload.find({
      collection: 'loans',
      where: {
        and: [{ status: { equals: 'accepted' } }, { pickupDate: { exists: true } }],
      },
      depth: 2,
      limit: DASHBOARD_PICKUP_LIMIT,
      sort: 'pickupDate',
      overrideAccess: false,
      user,
    }),

    // Latest reviews
    payload.find({
      collection: 'reviews',
      depth: 2,
      limit: 5,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    }),

    // Recent users for activity logs
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 30,
      sort: '-createdAt',
      overrideAccess: false,
      user,
    }),
  ])

  // Flatten activity logs from all users, sort by timestamp, take latest 20
  const allLogs = recentUsers.docs
    .flatMap((u) => {
      const logs = (u.activityLog ?? []) as Array<{
        action: string
        timestamp: string
        metadata?: string
      }>
      if (logs.length === 0) return []
      const displayName =
        u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
      return logs.map((log) => ({
        ...log,
        userName: displayName,
        userEmail: u.email,
      }))
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)

  return {
    now: Date.now(),
    stats: {
      pendingLoans: pendingLoans.totalDocs,
      pendingExtensions: pendingExtensions.totalDocs,
      severeOverdue: severeOverdue.totalDocs,
      pendingVerifications: pendingVerifications.totalDocs,
    },
    upcomingReturns: upcomingReturns.docs,
    upcomingPickups: upcomingPickups.docs,
    latestReviews: latestReviews.docs,
    recentActivityLogs: allLogs,
    pendingLoansList: pendingLoans.docs,
  }
}
