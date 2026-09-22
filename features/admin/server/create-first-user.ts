'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { setPayloadTokenCookie } from '@/shared/lib/auth'
import { createFirstAdmin } from './first-admin-core'

interface CreateFirstUserResult {
  ok: boolean
  error?: string
}

export async function hasAnyUser(): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
    })
    return result.totalDocs > 0
  } catch {
    return true // fail-closed: assume users exist if DB check fails
  }
}

export async function createFirstAdminUser(
  email: string,
  password: string,
): Promise<CreateFirstUserResult> {
  try {
    const payload = await getPayload({ config })

    const outcome = await createFirstAdmin(payload, email, password)

    if (outcome.kind === 'users-exist') {
      return { ok: false, error: 'المستخدمون موجودون بالفعل' }
    }

    if (outcome.kind === 'error') {
      return { ok: false, error: outcome.message }
    }

    const { token } = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (token) {
      await setPayloadTokenCookie(token)
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    return { ok: false, error: message }
  }
}
