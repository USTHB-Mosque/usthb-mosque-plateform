import { getPayload } from 'payload'
import config from '@/payload.config'

export async function registerForActivity(activityId: number) {
  'use server'

  const payload = await getPayload({ config })

  const result = await payload.create({
    collection: 'activity-registrations',
    data: {
      activity: activityId,
      user: 1,
    },
  })
}
