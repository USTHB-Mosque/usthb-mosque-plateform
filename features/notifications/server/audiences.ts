import type { PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import type { NotificationType } from '@/utils/notifications'
import { createNotification } from './create-notification'

type Notice = {
  type: NotificationType
  title: string
  message: string
  link: string
  eventKey?: string
}

export type AdminPreference =
  | 'loanRequests'
  | 'accountRequests'
  | 'loanExtensions'
  | 'overdueReturns'
  | 'newReviews'
  | 'activityLogEvents'

/**
 * Fan-out helper for bulk audiences (#154). `limit: 0` is Payload's
 * "all documents" form: audiences are small (one mosque community), so a
 * whole-collection read is cheaper and simpler than paging. Every write joins
 * the originating request's transaction.
 */
async function deliverToAudience(
  req: PayloadRequest,
  role: 'user' | 'admin',
  notice: Notice,
  preference?: AdminPreference,
) {
  const audience = await req.payload.find({
    collection: 'users',
    where: { role: { equals: role } },
    sort: 'id',
    limit: 0,
    depth: 0,
    req,
    overrideAccess: true,
  })
  for (const user of audience.docs as User[]) {
    if (user.deletedAt || (preference && user.notificationPreferences?.[preference] === false))
      continue
    const eventKey = notice.eventKey ? `${notice.eventKey}:${user.id}` : undefined
    if (eventKey) {
      // The unique event_key column makes the second write impossible; the
      // read just keeps the first delivery quiet instead of surfacing a
      // duplicate-key error.
      const existing = await req.payload.count({
        collection: 'notifications',
        where: { eventKey: { equals: eventKey } },
        req,
        overrideAccess: true,
      })
      if (existing.totalDocs) continue
    }
    await createNotification({ req, user: user.id, ...notice, eventKey })
  }
}

export async function notifyMembers(req: PayloadRequest, notice: Notice) {
  await deliverToAudience(req, 'user', notice)
}

export async function notifyAdmins(
  req: PayloadRequest,
  preference: AdminPreference,
  notice: Notice,
) {
  await deliverToAudience(req, 'admin', notice, preference)
}
