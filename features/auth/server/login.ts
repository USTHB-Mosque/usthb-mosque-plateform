'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { setPayloadTokenCookie } from '@/shared/lib/auth'
import { logActivity } from '@/utils/activity-log'

interface LoginResult {
  user: User | undefined
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const payload = await getPayload({ config })
  try {
    // payload.login throws on any failure, so a returned result always carries
    // the session: the casts below only satisfy the nullable result types.
    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    await setPayloadTokenCookie(result.token as string, result.exp)
    await logActivity(payload, (result.user as User).id, 'login')
    return { user: result.user as User }
  } catch {
    return { user: undefined }
  }
}
