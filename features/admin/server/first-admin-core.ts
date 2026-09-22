import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { logActivity } from '@/utils/activity-log'

export type FirstAdminOutcome =
  | { kind: 'created'; userId: User['id'] }
  | { kind: 'users-exist' }
  | { kind: 'error'; message: string }

export async function createFirstAdmin(
  payload: Payload,
  email: string,
  password: string,
): Promise<FirstAdminOutcome> {
  try {
    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
    })

    if (existingUsers.totalDocs > 0) {
      return { kind: 'users-exist' }
    }

    const user = await payload.create({
      collection: 'users',
      draft: false,
      data: {
        email,
        password,
        role: 'admin',
      },
    })

    // Activity logging is best-effort: the admin account already exists, so a
    // failed log entry must not turn a successful bootstrap into an error.
    try {
      await logActivity(payload, user.id, 'first_admin_created')
    } catch {
      // ignore — creation succeeded
    }

    return { kind: 'created', userId: user.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    if (message.includes('duplicate')) {
      return { kind: 'error', message: 'البريد الإلكتروني مستخدم بالفعل' }
    }
    return { kind: 'error', message }
  }
}
