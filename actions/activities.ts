'use server'

import { getPayloadWithUser } from '@/lib/server/payload-auth'

export async function registerForActivity(activityId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) {
    throw new Error('يجب تسجيل الدخول')
  }

  await ctx.payload.create({
    collection: 'activity-registrations',
    data: {
      activity: activityId,
      user: ctx.user.id,
    },
    req: ctx.req,
    overrideAccess: false,
  })
}
