'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cookies as nextCookies } from 'next/headers'
import { headers as nextHeaders } from 'next/headers'
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
    const payload = await getPayload({ config })
    const headers = await nextHeaders()
    const cookies = await nextCookies()

    const token = cookies.get('payload-token')
    if (token) {
      headers.set('Cookie', `payload-token=${token.value}`)
    }

    const auth = await payload.auth({ headers })
    if (!auth.user || (auth.user as User).role !== 'admin') {
      return null
    }

    const fullUser = await payload.findByID({
      collection: 'users',
      id: (auth.user as User).id,
      overrideAccess: true,
    })

    return fullUser as AdminUser
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