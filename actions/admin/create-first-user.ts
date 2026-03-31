'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cookies as nextCookies } from 'next/headers'

interface CreateFirstUserResult {
  ok: boolean
  error?: string
}

export async function createFirstAdminUser(
  email: string,
  password: string
): Promise<CreateFirstUserResult> {
  try {
    const payload = await getPayload({ config })
    const cookies = await nextCookies()

    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
    })

    if (existingUsers.totalDocs > 0) {
      return { ok: false, error: 'المستخدمون موجودون بالفعل' }
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        role: 'admin',
      },
    })

    const { token } = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (token) {
      cookies.set('payload-token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    if (message.includes('duplicate')) {
      return { ok: false, error: 'البريد الإلكتروني مستخدم بالفعل' }
    }
    return { ok: false, error: message }
  }
}