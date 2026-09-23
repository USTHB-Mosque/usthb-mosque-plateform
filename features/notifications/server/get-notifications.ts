'use server'

import type { Where } from 'payload'
import { getPayloadWithUser } from '@/shared/lib/auth'
import type { Notification } from '@/payload-types'
import type { NotificationType } from '@/utils/notifications'

export type NotificationListItem = {
  id: number
  type: NotificationType
  title: string
  message: string
  link: string | null
  seen: boolean
  createdAt: string
}

export type NotificationsPage = {
  notifications: NotificationListItem[]
  unreadCount: number
  totalDocs: number
  totalPages: number
  page: number
}

export type BellState = {
  unreadCount: number
  notifications: NotificationListItem[]
}

function serialize(docs: Notification[]): NotificationListItem[] {
  return docs.map((doc) => ({
    id: doc.id,
    // The column defaults to 'system', so null is a type-level fiction.
    /* v8 ignore next */
    type: doc.type ?? 'system',
    title: doc.title,
    message: doc.message,
    link: doc.link ?? null,
    // The column defaults to false, so null is a type-level fiction.
    /* v8 ignore next */
    seen: doc.seen ?? false,
    createdAt: new Date(doc.createdAt).toISOString(),
  }))
}

/**
 * The signed-in user's unread count. Shared by the bell round trip and the
 * SSE stream tick so both sides agree on what the badge counts.
 */
export async function countUnreadNotifications(
  ctx: NonNullable<Awaited<ReturnType<typeof getPayloadWithUser>>>,
) {
  const result = await ctx.payload.count({
    collection: 'notifications',
    where: { user: { equals: ctx.user.id }, seen: { equals: false } },
    req: ctx.req,
    overrideAccess: false,
  })
  return result.totalDocs
}

/**
 * Everything the bell needs in one round trip: unread count plus the most
 * recent 10 notifications. Returns null for anonymous callers — the bell
 * renders nothing for visitors (#17).
 */
export async function getBellState(): Promise<BellState | null> {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return null

  const latest = await ctx.payload.find({
    collection: 'notifications',
    where: { user: { equals: ctx.user.id } },
    sort: '-createdAt',
    limit: 10,
    depth: 0,
    req: ctx.req,
    overrideAccess: false,
  })

  return {
    unreadCount: await countUnreadNotifications(ctx),
    notifications: serialize(latest.docs),
  }
}

/**
 * The /user/notifications page data: the caller's rows filtered by seen and
 * type, with the current unread count for the badge.
 */
export async function getNotifications(args: {
  page?: number
  limit?: number
  seen?: boolean
  type?: NotificationType
}): Promise<NotificationsPage> {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) {
    return { notifications: [], unreadCount: 0, totalDocs: 0, totalPages: 0, page: 1 }
  }

  const conditions: Where[] = [{ user: { equals: ctx.user.id } }]
  if (args.seen !== undefined) conditions.push({ seen: { equals: args.seen } })
  if (args.type) conditions.push({ type: { equals: args.type } })

  const page = args.page && args.page > 0 ? args.page : 1
  const limit = args.limit && args.limit > 0 ? args.limit : 20

  const result = await ctx.payload.find({
    collection: 'notifications',
    where: { and: conditions },
    sort: '-createdAt',
    page,
    limit,
    depth: 0,
    req: ctx.req,
    overrideAccess: false,
  })

  return {
    notifications: serialize(result.docs),
    unreadCount: await countUnreadNotifications(ctx),
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    // Defensive: Payload types `page` as optional even though the requested
    // page is always echoed back.
    /* v8 ignore next */
    page: result.page ?? page,
  }
}
