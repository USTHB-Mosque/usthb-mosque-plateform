'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { setPayloadTokenCookie } from '@/shared/lib/auth'

interface LoginResult {
  user: User | undefined
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const payload = await getPayload({ config })
  try {
    const { user, token, exp } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })
    if (token) {
      await setPayloadTokenCookie(token, exp)
    }
    return { user: user as User }
  } catch {
    return { user: undefined }
  }
}