import type { Payload, PayloadRequest } from 'payload'
import type { Activity } from '@/payload-types'
import { resolveRelationId } from '@/shared/lib/relations'

/** Notify accepted members once for each session occurring in the next 24 hours. */
export async function sendActivityReminders(ctx: {
  payload: Payload
  req: PayloadRequest
}): Promise<number> {
  const { payload, req } = ctx
  const { createNotification } = await import('@/features/notifications')
  const now = Date.now()
  const nextDay = now + 24 * 60 * 60 * 1000
  const registrations = await payload.find({
    collection: 'activity-registrations',
    where: { status: { equals: 'accepted' } },
    pagination: false,
    depth: 1,
    req,
    overrideAccess: true,
  })
  let reminded = 0
  for (const registration of registrations.docs) {
    const activity = registration.activity as Activity
    const sessions = activity.schedules?.length
      ? activity.schedules.map((session) => session.dateAndTime)
      : [activity.startDate]
    for (const session of sessions) {
      const starts = new Date(session).getTime()
      if (starts <= now || starts > nextDay) continue
      const eventKey = `activity-reminder:${registration.id}:${session}`
      const previous = await payload.count({
        collection: 'notifications',
        where: { eventKey: { equals: eventKey } },
        req,
        overrideAccess: true,
      })
      if (previous.totalDocs) continue
      await createNotification({
        req,
        user: resolveRelationId(registration.user),
        type: 'activity',
        title: 'تذكير بالنشاط',
        message: `اقترب موعد «${activity.title}».`,
        link: `/user/activities/${activity.id}`,
        eventKey,
        email: true,
      })
      reminded++
    }
  }
  return reminded
}
