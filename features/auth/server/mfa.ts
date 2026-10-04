'use server'

import config from '@/payload.config'
import { getPayload } from 'payload'
import { createSessionForUser, setPayloadTokenCookie } from '@/shared/lib/auth'
import {
  allowSessionIssuance,
  consumeSecurityChallenge,
  resetAccountLoginAttempts,
} from '@/shared/lib/account-security'
import { logActivity } from '@/utils/activity-log'

export async function completeLoginChallenge(challenge: string, code: string) {
  const payload = await getPayload({ config })
  const result = await consumeSecurityChallenge(
    payload,
    challenge,
    code,
    'login',
    undefined,
    async (user, _security, req) => {
      await resetAccountLoginAttempts(payload, user.id, req)
      allowSessionIssuance(req)
      const session = await createSessionForUser(payload, user, { req })
      await logActivity(payload, user.id, 'login', undefined, req)
      return { ...session, user }
    },
  )
  if (!result.ok) return result
  await setPayloadTokenCookie(result.value.token, result.value.exp)
  return { ok: true as const, user: result.value.user }
}
