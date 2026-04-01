'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cookies as nextCookies } from 'next/headers'
import { User } from '@/payload-types'

interface AdminUser {
  id: number
  email: string
  fullName?: string
  role: 'admin' | 'user'
  profilePicture?: number
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const cookies = await nextCookies()
    const token = cookies.get('payload-token')
    if (!token) return null

    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const response = await fetch(`${serverURL}/api/users/me`, {
      headers: {
        Cookie: `payload-token=${token.value}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const user = data.user as User

    if (!user || user.role !== 'admin') {
      return null
    }

    return user as unknown as AdminUser
  } catch {
    return null
  }
}

export async function updateAdminProfile(fullName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getAdminUser()
    if (!user) {
      return { ok: false, error: 'غير مصرح' }
    }

    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { fullName },
      overrideAccess: true,
    })

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    return { ok: false, error: message }
  }
}

export async function updateAdminPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getAdminUser()
    if (!user) {
      return { ok: false, error: 'غير مصرح' }
    }

    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { password },
      overrideAccess: true,
    })

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    return { ok: false, error: message }
  }
}