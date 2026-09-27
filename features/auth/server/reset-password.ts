'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { logActivity } from '@/utils/activity-log'
import { revokeAllSessions } from '@/shared/lib/auth'

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
      // Payload's resetPassword signs the caller in — it adds a session and
      // revokes nothing — so without this a stolen session cookie outlives the
      // password change and the reset achieves nothing. Revoking all sessions
      // also discards the session Payload just minted; the flow issues no
      // cookie of its own, so the member simply signs in again.
      try {
        await revokeAllSessions(payload, user)
      } catch {
        // The password has already changed, so reporting a plain failure would
        // be a lie and a retry could not help. Say what actually happened.
        return {
          ok: false,
          error: 'تم تغيير كلمة المرور، لكن تعذّر إنهاء الجلسات. الرجاء تسجيل الدخول من جديد.',
        }
      }

      // Activity logging is best-effort: the password already changed, so a
      // failed log entry must not turn a successful reset into an error.
      try {
        await logActivity(payload, user.id, 'password_changed')
      } catch {
        // ignore — reset succeeded
      }
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('invalid or has expired')) {
      return { ok: false, error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' }
    }
    // Raw internals (DB errors, provider messages) must not reach the UI.
    return { ok: false, error: 'حدث خطأ، حاول مرة أخرى' }
  }
}
