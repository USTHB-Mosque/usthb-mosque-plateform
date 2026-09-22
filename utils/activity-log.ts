import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'

export type ActivityAction =
  | 'login'
  | 'password_changed'
  | 'profile_updated'
  | 'account_verified'
  | 'account_created'
  | 'first_admin_created'

const MAX_LOG_ENTRIES = 50

export async function logActivity(
  payload: Payload,
  userId: number | string,
  action: ActivityAction,
  metadata?: string,
  req?: PayloadRequest,
): Promise<void> {
  // `req` keeps the read and the write on the caller's transaction: during a
  // create the row is still uncommitted, so a separate connection sees nothing.
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    overrideAccess: true,
    ...(req ? { req } : {}),
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
    ...(req ? { req } : {}),
  })
}
