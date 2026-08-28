'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { setPayloadTokenCookie } from '@/lib/auth'

interface LoginResult {
  user: User | undefined
  token?: string
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const payload = await getPayload({ config })
  try {
    const { user, token } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })
    if (token) {
      await setPayloadTokenCookie(token)
    }
    return { user: user as User, token }
  } catch {
    return { user: undefined }
  }
}