'use server'

import { getPayloadWithUser, setPayloadTokenCookie } from '@/shared/lib/auth'
import { revalidatePath } from 'next/cache'
import { logoutOperation } from 'payload'
import { logActivity } from '@/utils/activity-log'

export async function updateProfileField(formData: FormData, field: string) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const value = (formData.get(field) as string)?.trim()
  if (!value) return { ok: false as const, error: 'القيمة مطلوبة' }

  const allowedFields = ['fullName', 'phone', 'email'] as const
  if (!allowedFields.includes(field as typeof allowedFields[number])) {
    return { ok: false as const, error: 'حقل غير صالح' }
  }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { [field]: value },
    req: ctx.req,
    overrideAccess: false,
  })
  await logActivity(ctx.payload, ctx.user.id, 'profile_updated', field)
  revalidatePath('/user/dashboard')
  revalidatePath('/user/settings')
  return { ok: true as const }
}

export async function updateProfileFullName(formData: FormData) {
  return updateProfileField(formData, 'fullName')
}

export async function updateNotificationPreferences(data: {
  loanRequests?: boolean
  activityRegistrations?: boolean
  loanExtensions?: boolean
}) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: {
      notificationPreferences: {
        loanRequests: data.loanRequests ?? true,
        activityRegistrations: data.activityRegistrations ?? true,
        loanExtensions: data.loanExtensions ?? true,
        loanReturnReminder: true,
      },
    },
    req: ctx.req,
    overrideAccess: false,
  })

  revalidatePath('/user/settings/notifications')
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

  await logActivity(ctx.payload, ctx.user.id, 'password_changed')

  revalidatePath('/user/dashboard')
  revalidatePath('/user/settings')
  return { ok: true as const }
}
