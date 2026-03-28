import { getPayload } from 'payload'
import config from '@/payload.config'

export async function registerForActivity(activityId: string) {
  'use server'

  const payload = await getPayload({ config })
}
