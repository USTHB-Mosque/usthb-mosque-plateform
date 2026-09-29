'use server'

import type { Notification } from '@/payload-types'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { isAdmin } from '@/utils/access-helpers'
import { escapeHtml } from '@/shared/lib/email'

/**
 * The on-demand Email Digest (#154): aggregates every member's unsent bulk
 * rows (new activities/articles, tagged `bulk:`) into one email per member who
 * opted in. Opt-in is off by default (CONTEXT.md); marking `emailSent` after a
 * successful send makes the run idempotent — nothing is sent twice.
 */
export async function sendBulkEmailDigest() {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx || !isAdmin(ctx.user)) throw new Error('Unauthorized')

  const optedIn = await ctx.payload.find({
    collection: 'users',
    where: {
      and: [
        { role: { equals: 'user' } },
        { 'notificationPreferences.bulkEmailDigest': { equals: true } },
      ],
    },
    limit: 0,
    sort: 'id',
    depth: 0,
    req: ctx.req,
    overrideAccess: true,
  })

  let sent = 0
  for (const member of optedIn.docs) {
    if (member.deletedAt) continue
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const queued = await ctx.payload.find({
      collection: 'notifications',
      where: {
        and: [
          { user: { equals: member.id } },
          { type: { in: ['activity', 'article'] } },
          { eventKey: { like: 'bulk:' } },
          { emailSent: { equals: false } },
          { createdAt: { greater_than: dayAgo } },
        ],
      },
      limit: 0,
      sort: 'createdAt',
      depth: 0,
      req: ctx.req,
      overrideAccess: true,
    })
    if (queued.docs.length === 0) continue

    try {
      await ctx.payload.sendEmail({
        to: member.email,
        subject: 'ملخص أنشطة ومقالات المسجد',
        html: `<div dir="rtl"><h2>آخر أنشطة ومقالات المسجد</h2><ul>${queued.docs
          .map((row) => {
            const notice = row as Notification
            return `<li><a href="${escapeHtml(notice.link ?? '')}">${escapeHtml(notice.title)}</a>: ${escapeHtml(notice.message)}</li>`
          })
          .join('')}</ul></div>`,
      })
    } catch (error) {
      console.error('[notifications] digest email failed', error)
      continue
    }

    for (const row of queued.docs) {
      await ctx.payload.update({
        collection: 'notifications',
        id: row.id,
        data: { emailSent: true },
        req: ctx.req,
        overrideAccess: true,
      })
    }
    sent += 1
  }
  return { sent }
}
