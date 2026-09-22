'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { logActivity } from '@/utils/activity-log'

export interface ResetPasswordResult {
  ok: boolean
  error?: string
}

export const resetPassword = async (
  token: string,
  password: string,
): Promise<ResetPasswordResult> => {
  try {
    const payload = await getPayload({ config })

    // Pre-auth operation: the token is the credential, no user is attached.
    const result = await payload.resetPassword({
      collection: 'users',
      data: { token, password },
      overrideAccess: true,
    })

    const user = result.user as unknown as User | undefined

    if (user) {
      await logActivity(payload, user.id, 'password_changed')
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('invalid or has expired')) {
      return { ok: false, error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' }
    }
    return { ok: false, error: message || 'حدث خطأ، حاول مرة أخرى' }
  }
}
