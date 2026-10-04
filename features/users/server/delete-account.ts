'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { softDeleteUserAccount } from './account-lifecycle'

export interface DeleteAccountResult {
  ok: boolean
  error?: string
}

/**
 * The member-facing half of the right to erasure: a signed-in member deletes
 * their own account, which soft-deletes it immediately (destroying the
 * Verification Document and revoking every session) and schedules the permanent
 * purge 30 days out.
 *
 * The session cookie is cleared here as well as server-side, so the browser
 * stops presenting a token that can no longer validate.
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  // `getPayloadWithUser()` is called without `allowAdmin`, so an admin never
  // reaches this branch — that exclusion is what keeps an administrator off the
  // member self-service surface. Admins delete accounts from the admin panel,
  // which goes through `softDeleteUserAccount` too.
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false, error: 'يجب تسجيل الدخول لحذف الحساب' }

  try {
    await softDeleteUserAccount(ctx.payload, ctx.user.id, ctx.req)
  } catch {
    return { ok: false, error: 'تعذّر حذف الحساب، حاول مرة أخرى' }
  }

  const cookieStore = await cookies()
  cookieStore.delete('payload-token')

  revalidatePath('/user', 'layout')
  redirect('/auth/login?deleted=1')
}
