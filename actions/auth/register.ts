'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cookies as nextCookies } from 'next/headers'
import { User } from '@/payload-types'

interface RegisterResult {
  user: User | undefined
  token?: string
  error?: string
}

export const register = async (email: string, password: string, fullName: string): Promise<RegisterResult> => {
  const payload = await getPayload({ config })
  const cookies = await nextCookies()
  
  try {
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email },
      },
    })

    if (existingUsers.docs.length > 0) {
      return { user: undefined, error: 'البريد الإلكتروني مستخدم بالفعل' }
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        fullName,
        role: 'user',
      },
    })

    const { token } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
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
    return { user: user as User, token }
  } catch (error) {
    console.error('Registration error:', error)
    return { user: undefined, error: 'حدث خطأ أثناء إنشاء الحساب' }
  }
}