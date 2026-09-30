'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { groupLogsByDay, type DayGroup } from '@/shared/lib/day-groups'
import { LogAction } from '@/collections/Log'
import type { Activity, Article, Book } from '@/payload-types'

type LogActionValue = (typeof LogAction)[keyof typeof LogAction]

export type ActivityLogSource = 'self' | 'admin'

/** One row of the member's timeline: what they did, or what was done to them. */
export interface ActivityLogEvent {
  id: string
  timestamp: string
  source: ActivityLogSource
  /** Member-facing wording. The stored `message` is the admin's own sentence
   * and names other people's actions — it never leaves this screen (#165). */
  label: string
  /** Book / activity / article title, when the event has one. */
  detail?: string
}

export interface ActivityLogPage {
  groups: DayGroup<ActivityLogEvent>[]
  page: number
  totalPages: number
  totalDocs: number
}

/**
 * How each audit line reads to the member it is about. Only the actions that
 * can target a member are listed — the rest of the `LogAction` vocabulary is
 * the admin panel's business and has no wording for a reader who did not
 * perform it.
 */
const memberLogLabels: Partial<Record<LogActionValue, string>> = {
  [LogAction.LoanApproved]: 'قُبل طلب الإعارة',
  [LogAction.LoanRefused]: 'رُفض طلب الإعارة',
  [LogAction.LoanExpired]: 'انتهت نافذة الاستلام',
  [LogAction.LoanRescheduled]: 'أُعيد جدولة موعد الاستلام',
  [LogAction.LoanPickedUp]: 'استلمت الكتاب',
  [LogAction.LoanReturned]: 'أُعيد الكتاب إلى المكتبة',
  [LogAction.LoanCancelled]: 'ألغيت طلب الإعارة',
  [LogAction.ExtensionApproved]: 'قُبل طلب التمديد',
  [LogAction.ExtensionRefused]: 'رُفض طلب التمديد',
  [LogAction.ExtensionWithdrawn]: 'سحبت طلب التمديد',
  [LogAction.UserVerified]: 'تم توثيق حسابك',
  [LogAction.UserRejected]: 'رُفض طلب التوثيق',
  [LogAction.UserBlockLifted]: 'رُفع حجب الإعارة عن حسابك',
  [LogAction.UserRoleChanged]: 'تغيّر دورك في المنصة',
  [LogAction.UserDeleted]: 'حُذف حسابك',
}

/** Defensive only: a future action reaches this screen before its wording does. */
const UNKNOWN_ACTION = 'حدث في حسابك'

/** What the member did themselves, derived from their own rows (#165). */
const ownActionLabels = {
  loan: 'طلبت إعارة كتاب',
  extension: 'طلبت تمديد إعارة',
  waitlist: 'انضممت إلى قائمة الانتظار',
  registration: 'سجّلت في نشاط',
  bookFavorite: 'أضفت كتاباً إلى المفضلة',
  articleFavorite: 'أضفت مقالاً إلى المفضلة',
  review: 'كتبت تقييماً',
} as const

const DEFAULT_LIMIT = 20

/**
 * Rows read per source. Merging the first `page` pages only needs `page *
 * limit` from each, so the fetch grows with the page up to this cap. The loans
 * always come up to the cap because they double as the title index for every
 * loan-targeted log line on the screen.
 */
const MAX_PER_SOURCE = 500

/**
 * The signed-in member's history (#165): their own actions, derived from the
 * rows they own, merged with the audit lines the administration wrote about
 * them. Grouped by local day, newest first, paginated.
 *
 * Both reads run with `overrideAccess: false` and the member as `user`, so the
 * rules in `collections/Log.ts` and in each source collection are what decide
 * what this returns.
 */
export async function getActivityLog(
  params: { page?: number; limit?: number } = {},
): Promise<ActivityLogPage | null> {
  const { page = 1, limit = DEFAULT_LIMIT } = params

  const ctx = await getPayloadWithUser()
  if (!ctx) return null

  const safePage = Math.max(1, Math.trunc(page))
  const safeLimit = Math.max(1, Math.trunc(limit))
  const perSource = Math.min(safeLimit * safePage, MAX_PER_SOURCE)

  const [
    logDocs,
    loanDocs,
    extensionDocs,
    waitlistDocs,
    registrationDocs,
    bookFavoriteDocs,
    articleFavoriteDocs,
    reviewDocs,
  ] = await Promise.all([
    ctx.payload.find({
      collection: 'logs',
      // Which of the caller's own rows belong on the timeline — the read rule
      // in collections/Log.ts is what narrows this to the caller.
      where: {
        or: [{ targetType: { in: ['user', 'loan'] } }, { actor: { equals: ctx.user.id } }],
      },
      sort: '-timestamp',
      limit: perSource,
      depth: 0,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'loans',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: MAX_PER_SOURCE,
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'loan-extensions',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: perSource,
      depth: 0,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'waitlist-entries',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: perSource,
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'activity-registrations',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: perSource,
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'book-favorites',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: perSource,
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'article-favorites',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: perSource,
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'reviews',
      where: { user: { equals: ctx.user.id } },
      sort: '-createdAt',
      limit: perSource,
      depth: 1,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
  ])

  const events: ActivityLogEvent[] = []
  const loanTitles = new Map<string, string>()
  const at = (value: string) => new Date(value).toISOString()

  // Loans first: they seed the title index the extension and log rows read.
  for (const doc of loanDocs.docs) {
    const title = (doc.book as Book).title
    loanTitles.set(String(doc.id), title)
    events.push({
      id: `loan-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.loan,
      detail: title,
    })
  }

  for (const doc of extensionDocs.docs) {
    events.push({
      id: `extension-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.extension,
      detail: loanTitles.get(String(doc.loan)),
    })
  }

  for (const doc of waitlistDocs.docs) {
    events.push({
      id: `waitlist-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.waitlist,
      detail: (doc.book as Book).title,
    })
  }

  for (const doc of registrationDocs.docs) {
    events.push({
      id: `registration-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.registration,
      detail: (doc.activity as Activity).title,
    })
  }

  for (const doc of bookFavoriteDocs.docs) {
    events.push({
      id: `book-favorite-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.bookFavorite,
      detail: (doc.book as Book).title,
    })
  }

  for (const doc of articleFavoriteDocs.docs) {
    events.push({
      id: `article-favorite-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.articleFavorite,
      detail: (doc.article as Article).title,
    })
  }

  for (const doc of reviewDocs.docs) {
    // Reviews target exactly one of the two, so the other side is null.
    const subject = doc.book ?? doc.article
    events.push({
      id: `review-${doc.id}`,
      timestamp: at(doc.createdAt),
      source: 'self',
      label: ownActionLabels.review,
      detail: (subject as Book | Article).title,
    })
  }

  for (const doc of logDocs.docs) {
    events.push({
      id: `log-${doc.id}`,
      timestamp: at(doc.timestamp),
      // `depth: 0`: the actor arrives as the raw id, or null once that admin
      // account is gone — neither is the member themselves.
      source: (doc.actor as number | null) === ctx.user.id ? 'self' : 'admin',
      label: memberLogLabels[doc.action as LogActionValue] ?? UNKNOWN_ACTION,
      detail: doc.targetType === 'loan' ? loanTitles.get(String(doc.targetId)) : undefined,
    })
  }

  // Newest first; ISO-8601 compares correctly as a string.
  events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

  const totalDocs =
    logDocs.totalDocs +
    loanDocs.totalDocs +
    extensionDocs.totalDocs +
    waitlistDocs.totalDocs +
    registrationDocs.totalDocs +
    bookFavoriteDocs.totalDocs +
    articleFavoriteDocs.totalDocs +
    reviewDocs.totalDocs

  const start = (safePage - 1) * safeLimit

  return {
    groups: groupLogsByDay(events.slice(start, start + safeLimit)),
    page: safePage,
    totalPages: Math.ceil(totalDocs / safeLimit),
    totalDocs,
  }
}
