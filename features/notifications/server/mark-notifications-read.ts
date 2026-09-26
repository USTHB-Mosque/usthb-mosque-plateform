'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'

/**
 * Marks one notification as read. Only the owner can pass — anyone else's
 * row fails the update access constraint and lands in the catch branch (#17).
 */
export async function markNotificationRead(id: number | string) {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }

  try {
    await ctx.payload.update({
      collection: 'notifications',
      id,
      data: { seen: true },
      req: ctx.req,
      overrideAccess: false,
    })
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'الإشعار غير متوفر' }
  }
}

/**
 * Marks every unseen notification of the signed-in user as read. The update
 * access constraint scopes the where clause to the caller's own rows, so
 * other members' notifications are untouched.
 */
export async function markAllNotificationsRead() {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }

  try {
    const result = await ctx.payload.update({
      collection: 'notifications',
      where: {
        and: [{ user: { equals: ctx.user.id } }, { seen: { equals: false } }],
      },
      data: { seen: true },
      req: ctx.req,
      overrideAccess: false,
    })
    return { ok: true as const, count: result.docs.length }
  } catch {
    return { ok: false as const, error: 'تعذر تحديث الإشعارات' }
  }
}
