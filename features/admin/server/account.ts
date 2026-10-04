'use server'
import type { User } from '@/payload-types'
import {
  clearPayloadTokenCookie,
  createSessionForUser,
  getPayloadWithUser,
  setPayloadTokenCookie,
} from '@/shared/lib/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/utils/activity-log'
import { getAdminLogs } from './logs'
import { isAdmin } from '@/utils/access-helpers'
import { beginAdminReauthentication } from './security'
import {
  allowSessionIssuance,
  ensureAccountSecurity,
  hasRecentAuthentication,
  requireRecentAuthentication,
  withAccountLock,
} from '@/shared/lib/account-security'
import { securityAudit } from './security-audit'
import { publicAccountError } from '@/shared/lib/account-error'

async function getAdminContext() {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx || !isAdmin(ctx.user)) return null
  return ctx
}

/** Client-callable account query returns data, never Payload or a request. */
export async function getAdminUser() {
  const ctx = await getAdminContext()
  return ctx?.user ?? null
}

async function updateAdminField(data: {
  fullName?: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await getAdminContext()
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
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: 'غير مصرح' }
  if (password.length < 8)
    return { ok: false, error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }
  try {
    await requireRecentAuthentication(ctx.payload, ctx.user)
    const result = await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        await requireRecentAuthentication(ctx.payload, ctx.user, req)
        allowSessionIssuance(req)
        await ctx.payload.update({
          collection: 'users',
          id: ctx.user.id,
          data: { password },
          req,
          overrideAccess: false,
        })
        const session = await createSessionForUser(ctx.payload, ctx.user, { req })
        await securityAudit(
          ctx.payload,
          ctx.user,
          'password_changed',
          'غيّر كلمة المرور وسجّل خروج الأجهزة الأخرى',
          req,
        )
        return session
      },
      ctx.req,
    )
    await setPayloadTokenCookie(result.token, result.exp)
    await logActivity(ctx.payload, ctx.user.id, 'password_changed')
    revalidatePath('/admin-panel/settings', 'layout')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: publicAccountError(error, 'تعذر تغيير كلمة المرور') }
  }
}

export async function getAdminSettingsData(): Promise<{ user: User } | null> {
  const ctx = await getAdminContext()
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
  const ctx = await getAdminContext()
  if (!ctx) return null
  const [user, logs] = await Promise.all([
    ctx.payload.findByID({
      collection: 'users',
      id: ctx.user.id,
      req: ctx.req,
      overrideAccess: false,
      depth: 2,
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
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  if (!sessionId || (!currentPassword && !(await hasRecentAuthentication(ctx.payload, ctx.user))))
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
    if (currentPassword) {
      const confirmation = await beginAdminReauthentication(currentPassword)
      if (!confirmation.ok) throw new Error(confirmation.error)
    }
    await requireRecentAuthentication(ctx.payload, ctx.user)
  } catch {
    return { ok: false as const, error: 'كلمة المرور الحالية غير صحيحة' }
  }

  await withAccountLock(
    ctx.payload,
    ctx.user.id,
    async (req) => {
      await requireRecentAuthentication(ctx.payload, ctx.user, req)
      const current = await ctx.payload.findByID({
        collection: 'users',
        id: ctx.user.id,
        depth: 0,
        req,
      })
      await ctx.payload.update({
        collection: 'users',
        id: current.id,
        // Recent authentication above proves an active session list while this
        // transaction holds the user row; no other writer can clear it here.
        data: { sessions: current.sessions!.filter((session) => session.id !== sessionId) },
        req,
        overrideAccess: true,
      })
      const security = await ensureAccountSecurity(ctx.payload, ctx.user.id, req)
      const nextRevision = security.revision + 1
      await ctx.payload.update({
        collection: 'account-security',
        id: security.id,
        data: {
          revision: nextRevision,
          reauthenticatedSessions: Object.fromEntries(
            Object.entries(security.reauthenticatedSessions as Record<string, string>).filter(
              ([sid]) => sid !== sessionId,
            ),
          ),
          assuredSessions: Object.fromEntries(
            Object.entries(security.assuredSessions as Record<string, number>)
              .filter(([sid]) => sid !== sessionId)
              .map(([sid]) => [sid, nextRevision]),
          ),
        },
        req,
      })
      await securityAudit(
        ctx.payload,
        ctx.user,
        'device_revoked',
        'سجّل خروج جهاز مرتبط بحسابه',
        req,
      )
    },
    ctx.req,
  )
  if ((ctx.user as User & { _sid?: string })._sid === sessionId) await clearPayloadTokenCookie()
  revalidatePath('/admin-panel/settings/security')
  return { ok: true as const }
}

export async function updateAdminSettingsField(formData: FormData, field: string) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const value = (formData.get(field) as string)?.trim()
  if (!value) return { ok: false as const, error: 'القيمة مطلوبة' }

  const allowedFields = ['fullName', 'phone'] as const
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

export async function updateAdminAccountInfo(formData: FormData) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!firstName || !lastName) return { ok: false as const, error: 'الإسم واللقب مطلوبان' }
  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { firstName, lastName, fullName: `${firstName} ${lastName}`, phone },
    req: ctx.req,
    overrideAccess: false,
  })
  await logActivity(ctx.payload, ctx.user.id, 'profile_updated', 'account_info')
  revalidatePath('/admin-panel', 'layout')
  return { ok: true as const }
}

export async function updateAdminNotificationPreferences(data: {
  loanRequests?: boolean
  accountRequests?: boolean
  loanExtensions?: boolean
  overdueReturns?: boolean
  newReviews?: boolean
  activityLogEvents?: boolean
}) {
  const ctx = await getAdminContext()
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
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const current = formData.get('currentPassword') as string
  const next = formData.get('newPassword') as string
  const confirm = formData.get('confirmPassword') as string
  if (!next || next.length < 8) {
    return { ok: false as const, error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }
  }
  if (next !== confirm) return { ok: false as const, error: 'تأكيد كلمة المرور غير متطابق' }

  try {
    if (current) {
      const confirmation = await beginAdminReauthentication(current)
      if (!confirmation.ok) throw new Error(confirmation.error)
    } else if (!(await hasRecentAuthentication(ctx.payload, ctx.user))) {
      return { ok: false as const, error: 'أعد تأكيد هويتك قبل تغيير كلمة المرور' }
    }
    await requireRecentAuthentication(ctx.payload, ctx.user)
  } catch {
    return { ok: false as const, error: 'كلمة المرور الحالية غير صحيحة' }
  }

  return updateAdminPassword(next)
}
