'use server'
import { createLocalReq } from 'payload'
import { getPayloadWithUser } from '@/shared/lib/auth'

export async function getAdminUser() {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx || ctx.user.role !== 'admin') return null
  return ctx
}

async function updateAdminField(data: {
  fullName?: string
  password?: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getAdminUser()
    if (!ctx) {
      return { ok: false, error: 'غير مصرح' }
    }

    const { payload, user, req } = ctx
    await payload.update({
      collection: 'users',
      id: user.id,
      data,
      overrideAccess: false,
      req,
    })

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    return { ok: false, error: message }
  }
}

export async function updateAdminProfile(
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  return updateAdminField({ fullName })
}

export async function updateAdminPassword(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  return updateAdminField({ password })
}
