'use server'
import type { User } from '@/payload-types'
import { createLocalReq } from 'payload'
import { getPayloadWithUser, setPayloadTokenCookie } from '@/shared/lib/auth'
import { revalidatePath } from 'next/cache'
import { logoutOperation } from 'payload'
import { logActivity } from '@/utils/activity-log'
import { getAdminLogs } from './logs'

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

export async function getAdminSettingsData(): Promise<{ user: User } | null> {
  const ctx = await getAdminUser()
  if (!ctx) return null

  const user = (await ctx.payload.findByID({
    collection: 'users',
    id: ctx.user.id,
    req: ctx.req,
    overrideAccess: false,
    depth: 2,
  })) as User

  return { user }
}

export async function getAdminSecurityData() {
  const ctx = await getAdminUser()
  if (!ctx) return null
  const [user, logs] = await Promise.all([
    ctx.payload.findByID({
      collection: 'users',
      id: ctx.user.id,
      req: ctx.req,
      overrideAccess: false,
      depth: 0,
    }),
    getAdminLogs({ actor: ctx.user.id, limit: 50 }),
  ])
  return {
    user: user as User,
    accountLogs: logs.logs,
    currentSessionId: (ctx.req.user as { _sid?: string } | undefined)?._sid ?? null,
  }
}

export async function revokeAdminSession(sessionId: string, currentPassword: string) {
  const ctx = await getAdminUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  if (!sessionId || !currentPassword)
    return { ok: false as const, error: 'أدخل كلمة المرور الحالية' }

  const freshUser = await ctx.payload.findByID({
    collection: 'users',
    id: ctx.user.id,
    req: ctx.req,
    overrideAccess: false,
    depth: 0,
  })
  const sessions = freshUser.sessions ?? []
  if (!sessions.some((session) => session.id === sessionId)) {
    return { ok: false as const, error: 'الجهاز غير موجود أو تم تسجيل خروجه' }
  }

  try {
    await ctx.payload.login({
      collection: 'users',
      data: { email: ctx.user.email, password: currentPassword },
    })
  } catch {
    return { ok: false as const, error: 'كلمة المرور الحالية غير صحيحة' }
  }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { sessions: sessions.filter((session) => session.id !== sessionId) },
    req: ctx.req,
    overrideAccess: true,
  })
  revalidatePath('/admin-panel/settings/security')
  return { ok: true as const }
}

export async function updateAdminSettingsField(formData: FormData, field: string) {
  const ctx = await getAdminUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const value = (formData.get(field) as string)?.trim()
  if (!value) return { ok: false as const, error: 'القيمة مطلوبة' }

  const allowedFields = ['fullName', 'phone', 'email'] as const
  if (!allowedFields.includes(field as (typeof allowedFields)[number])) {
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
  revalidatePath('/admin-panel/settings')
  return { ok: true as const }
}

export async function updateAdminPhone(formData: FormData) {
  return updateAdminSettingsField(formData, 'phone')
}

export async function updateAdminNotificationPreferences(data: {
  loanRequests?: boolean
  accountRequests?: boolean
  loanExtensions?: boolean
  overdueReturns?: boolean
  newReviews?: boolean
  activityLogEvents?: boolean
}) {
  const ctx = await getAdminUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: {
      notificationPreferences: {
        loanRequests: data.loanRequests ?? true,
        accountRequests: data.accountRequests ?? true,
        loanExtensions: data.loanExtensions ?? true,
        overdueReturns: data.overdueReturns ?? true,
        newReviews: data.newReviews ?? true,
        activityLogEvents: data.activityLogEvents ?? true,
      },
    },
    req: ctx.req,
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/settings/notifications')
  return { ok: true as const }
}

export async function changeAdminPassword(formData: FormData) {
  const ctx = await getAdminUser()
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

  // payload.login throws on failure, so a returned result always has a token.
  const { token, exp } = await ctx.payload.login({
    collection: 'users',
    data: { email: ctx.user.email, password: next },
  })
  await setPayloadTokenCookie(token as string, exp)

  await logActivity(ctx.payload, ctx.user.id, 'password_changed')

  revalidatePath('/admin-panel/settings')
  return { ok: true as const }
}
