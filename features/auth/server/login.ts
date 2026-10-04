'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { createSessionForUser, setPayloadTokenCookie } from '@/shared/lib/auth'
import {
  createSecurityChallenge,
  probePassword,
  readAccountSecurity,
  withAccountLock,
  resetAccountLoginAttempts,
} from '@/shared/lib/account-security'
import { logActivity } from '@/utils/activity-log'

interface LoginResult {
  user: User | undefined
  challenge?: string
  expiresAt?: string
  destination?: string
  deliveryFailed?: boolean
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const payload = await getPayload({ config })
  try {
    const user = await probePassword(payload, email, password)
    const security = await readAccountSecurity(payload, user.id)
    if (security?.emailTwoFactorEnabled) {
      return {
        user: undefined,
        ...(await createSecurityChallenge(payload, user, 'login', user.email)),
      }
    }
    const result = await withAccountLock(payload, user.id, async (req) => {
      await resetAccountLoginAttempts(payload, user.id, req)
      return createSessionForUser(payload, user, { req })
    })

    await setPayloadTokenCookie(result.token, result.exp)
    await logActivity(payload, user.id, 'login')
    return { user }
  } catch {
    return { user: undefined }
  }
}
