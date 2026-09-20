import type { Payload } from 'payload'
import type { User } from '@/payload-types'

export type ActivityAction =
  'login' | 'password_changed' | 'profile_updated' | 'account_verified' | 'account_created'

const MAX_LOG_ENTRIES = 50

export async function logActivity(
  payload: Payload,
  userId: number | string,
  action: ActivityAction,
  metadata?: string,
): Promise<void> {
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    overrideAccess: true,
  })

  const existingLog = (user.activityLog ?? []) as NonNullable<User['activityLog']>

  const newEntry = {
    action,
    timestamp: new Date().toISOString(),
    metadata: metadata ?? '',
  }

  const updatedLog = [newEntry, ...existingLog].slice(0, MAX_LOG_ENTRIES)

  await payload.update({
    collection: 'users',
    id: userId,
    data: { activityLog: updatedLog },
    overrideAccess: true,
  })
}
