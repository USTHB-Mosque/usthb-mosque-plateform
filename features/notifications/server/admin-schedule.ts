import type { PayloadRequest } from 'payload'
import type { Loan } from '@/payload-types'
import { notifyAdmins } from './audiences'

/**
 * Time-based admin triggers (#154): severe overdues (the dashboard's 7-day
 * threshold) and pickups due today, written on demand when an admin reads the
 * bell or the updates inbox. Per-loan event keys guarantee one notification
 * per event even across repeated reads.
 */
export async function syncAdminSchedule(req: PayloadRequest) {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  const severe = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const overdue = await req.payload.find({
    collection: 'loans',
    where: {
      and: [{ status: { in: ['accepted', 'picked_up'] } }, { dueDate: { less_than: severe } }],
    },
    limit: 0,
    depth: 0,
    req,
    overrideAccess: true,
  })
  for (const loan of overdue.docs as Loan[]) {
    await notifyAdmins(req, 'overdueReturns', {
      type: 'loan',
      title: 'إعارة متأخرة بشدة',
      message: `تأخرت إعارة «${loan.id}» أكثر من سبعة أيام على موعد الإرجاع.`,
      link: '/admin-panel/loans/overdue',
      eventKey: `admin:overdue:${loan.id}`,
    })
  }

  const pickups = await req.payload.find({
    collection: 'loans',
    where: {
      and: [
        { status: { equals: 'accepted' } },
        { pickupDate: { greater_than_equal: `${day}T00:00:00.000Z` } },
        { pickupDate: { less_than_equal: `${day}T23:59:59.999Z` } },
      ],
    },
    limit: 0,
    depth: 0,
    req,
    overrideAccess: true,
  })
  for (const loan of pickups.docs as Loan[]) {
    await notifyAdmins(req, 'loanRequests', {
      type: 'loan',
      title: 'استلام كتاب اليوم',
      message: `موعد استلام «${loan.id}» اليوم.`,
      link: '/admin-panel/dashboard',
      eventKey: `admin:pickup:${loan.id}:${day}`,
    })
  }
}
