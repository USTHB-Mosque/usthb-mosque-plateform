'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { getAuthenticatedUser } from '@/lib/auth'

interface AdminUser {
  id: number
  email: string
  fullName?: string
  role: 'admin' | 'user'
  profilePicture?: number
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getAuthenticatedUser({ allowAdmin: true })
  if (!user || user.role !== 'admin') return null
  return user as unknown as AdminUser
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