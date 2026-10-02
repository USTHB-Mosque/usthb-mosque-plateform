import type { Payload, PayloadRequest } from 'payload'
import type { User, Activity } from '@/payload-types'
import { activityEndTime } from '../end-time'

/** Idempotent sweep, also used as a lazy safety net on member/admin reads. */
export async function completeFinishedRegistrations(
  ctx: { payload: Payload; req: PayloadRequest; user?: User },
  activityId?: number,
) {
  const { payload, req, user } = ctx
  const rows = await payload.find({
    collection: 'activity-registrations',
    where: {
      and: [
        { status: { in: ['pending', 'accepted'] } },
        ...(activityId
          ? [{ activity: { equals: activityId } }]
          : user
            ? [{ user: { equals: user.id } }]
            : []),
      ],
    },
    req,
    overrideAccess: !user,
    pagination: false,
    depth: 1,
  })
  let completed = 0
  for (const row of rows.docs) {
    const activity = row.activity as Activity
    if (activityEndTime(activity) > Date.now()) continue
    await payload.update({
      collection: 'activity-registrations',
      id: row.id,
      data: { status: 'completed' },
      req,
      overrideAccess: true,
      context: { completeActivity: true },
    })
    completed++
  }
  return completed
}
