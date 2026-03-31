'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cookies as nextCookies } from 'next/headers'
import { User } from '@/payload-types'

export const register = async (email: string, password: string, fullName: string): Promise<User | undefined> => {
  const payload = await getPayload({ config })
  const cookies = await nextCookies()
  try {
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
    return user as User
  } catch (error) {
    console.log(error)
    return undefined
  }
}