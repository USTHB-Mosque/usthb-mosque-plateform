'use server'

import { getPayloadWithUser, setPayloadTokenCookie } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logoutOperation } from 'payload'

export async function updateProfileFullName(formData: FormData) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const fullName = (formData.get('fullName') as string)?.trim()
  if (!fullName) return { ok: false as const, error: 'الاسم مطلوب' }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { fullName },
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/user/dashboard')
  revalidatePath('/user/settings')
  return { ok: true as const }
}

export async function changePassword(formData: FormData) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const current = formData.get('currentPassword') as string
  const next = formData.get('newPassword') as string
  const confirm = formData.get('confirmPassword') as string
  if (!next || next.length < 8) {
    return { ok: false as const, error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }
  }
  if (next !== confirm) return { ok: false as const, error: 'تأكيد كلمة المرور غير متطابق' }

  try {
    await ctx.payload.login({
      collection: 'users',
      data: {
        email: ctx.user.email,
        password: current,
      },
    })
  } catch {
    return { ok: false as const, error: 'كلمة المرور الحالية غير صحيحة' }
  }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { password: next },
    req: ctx.req,
    overrideAccess: false,
  })

  // A stolen session must not survive a password change: revoke every
  // session the login check above and the old password may have left behind,
  // then issue exactly one fresh session for this device.
  await logoutOperation({
    allSessions: true,
    collection: ctx.payload.collections['users'],
    req: ctx.req,
  })

  const { token, exp } = await ctx.payload.login({
    collection: 'users',
    data: { email: ctx.user.email, password: next },
  })
  if (token) {
    await setPayloadTokenCookie(token, exp)
  }

  revalidatePath('/user/dashboard')
  revalidatePath('/user/settings')
  return { ok: true as const }
}
