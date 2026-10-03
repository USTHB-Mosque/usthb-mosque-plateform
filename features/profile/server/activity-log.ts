'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { groupLogsByDay, type DayGroup } from '@/shared/lib/day-groups'
import { resolveRelationId } from '@/shared/lib/relations'
import { LogAction } from '@/collections/Log'
import { MemberEventAction, type MemberEventTargetType } from '@/collections/MemberEvent'
import type { MemberEventActionValue } from './member-events'
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

/** What the member did themselves, read off `member-events` (#178). */
const memberEventLabels: Record<MemberEventActionValue, string> = {
  [MemberEventAction.LoanRequested]: 'طلبت إعارة كتاب',
  [MemberEventAction.ExtensionRequested]: 'طلبت تمديد إعارة',
  [MemberEventAction.WaitlistJoined]: 'انضممت إلى قائمة الانتظار',
  [MemberEventAction.RegistrationCreated]: 'سجّلت في نشاط',
  [MemberEventAction.BookFavorited]: 'أضفت كتاباً إلى المفضلة',
  [MemberEventAction.ArticleFavorited]: 'أضفت مقالاً إلى المفضلة',
  [MemberEventAction.ReviewCreated]: 'كتبت تقييماً',
}

const DEFAULT_LIMIT = 20

/**
 * A detail still to be resolved into a title. Content events name the book /
 * activity / article they were about; audit lines about loans name the loan
 * row, whose book title rides along the way it always has (#165).
 */
type PendingDetail =
  | { kind: 'content'; targetType: MemberEventTargetType; targetId: string }
  | { kind: 'loan'; loanId: string }

interface TimelineRow {
  id: string
  timestamp: string
  /** Milliseconds since epoch, precomputed: the sort below is branch-free so
   * its coverage does not depend on whether the data happened to arrive
   * already interleaved. */
  epoch: number
  source: ActivityLogSource
  label: string
  detail: PendingDetail | null
}

/**
 * The signed-in member's history (#165, #178): their own actions, read from
 * the append-only `member-events` stream the hooks write, merged with the
 * audit lines the administration wrote about them in `logs`. Grouped by local
 * day, newest first, paginated.
 *
 * The event stream is what makes the timeline durable: a favorite may be
 * un-favorited and a registration withdrawn, but the record that the member
 * made them survives because nothing deletes `member-events` rows (#178). The
 * seven-collection fan-out this used to re-derive from is gone with it —
 * including for loans and extensions, whose derived reads were the cheap
 * half: keeping them would have left two code paths and the MAX_PER_SOURCE
 * cap alive for no durability gain (#178, open question 3).
 *
 * Both reads run with `overrideAccess: false` and the member as `user`, so the
 * rules in `collections/Log.ts` and `collections/MemberEvent.ts` are what
 * decide what this returns. Title resolution afterwards is a render-time
 * metadata lookup performed *on behalf of* the read — the same documented
 * bypass the log read rule uses — and resolves only what landed on the page.
 */
export async function getActivityLog(
  params: { page?: number; limit?: number } = {},
): Promise<ActivityLogPage | null> {
  const { page = 1, limit = DEFAULT_LIMIT } = params

  const ctx = await getPayloadWithUser()
  if (!ctx) return null

  const safePage = Math.max(1, Math.trunc(page))
  const safeLimit = Math.max(1, Math.trunc(limit))
  // Merging the first `page` pages only needs `page * limit` from each
  // source. No per-source cap: the fetch grows with the page exactly as far
  // as the slice can reach (#178 removed the seven-way MAX_PER_SOURCE cap).
  const perSource = safeLimit * safePage

  const [eventDocs, logDocs] = await Promise.all([
    ctx.payload.find({
      collection: 'member-events',
      where: { user: { equals: ctx.user.id } },
      sort: '-timestamp',
      limit: perSource,
      depth: 0,
      req: ctx.req,
      overrideAccess: false,
      user: ctx.user,
    }),
    ctx.payload.find({
      collection: 'logs',
      // Which of the audit lines belong on the timeline — the read rule in
      // collections/Log.ts is what narrows this to the caller.
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
  ])

  const rows: TimelineRow[] = []
  const at = (value: string) => new Date(value).toISOString()

  for (const doc of eventDocs.docs) {
    rows.push({
      id: `event-${doc.id}`,
      timestamp: at(doc.timestamp),
      epoch: Date.parse(doc.timestamp),
      source: 'self',
      label: memberEventLabels[doc.action as MemberEventActionValue],
      detail: {
        kind: 'content',
        targetType: doc.targetType as MemberEventTargetType,
        targetId: String(doc.targetId),
      },
    })
  }

  for (const doc of logDocs.docs) {
    rows.push({
      id: `log-${doc.id}`,
      timestamp: at(doc.timestamp),
      epoch: Date.parse(doc.timestamp),
      // `depth: 0`: the actor arrives as the raw id, or null once that admin
      // account is gone — neither is the member themselves.
      source: (doc.actor as number | null) === ctx.user.id ? 'self' : 'admin',
      label: memberLogLabels[doc.action as LogActionValue] ?? UNKNOWN_ACTION,
      detail: doc.targetType === 'loan' ? { kind: 'loan', loanId: String(doc.targetId) } : null,
    })
  }

  // Newest first. Both streams arrive sorted by the database, but they must
  // merge into one order here; a numeric difference has no conditional branch,
  // unlike a string comparison, whose "inverted pair" side could go untested
  // whenever the merged rows happen to arrive already ordered.
  rows.sort((a, b) => b.epoch - a.epoch)

  const start = (safePage - 1) * safeLimit
  const pageRows = rows.slice(start, start + safeLimit)

  // ---- resolve titles for exactly the page: books, activities, articles —
  // and, for loan-targeted audit lines, the book behind each loan.
  const contentIds: Record<MemberEventTargetType, Set<string>> = {
    book: new Set(),
    activity: new Set(),
    article: new Set(),
  }
  const loanIds = new Set<string>()
  for (const row of pageRows) {
    if (!row.detail) continue
    if (row.detail.kind === 'loan') {
      loanIds.add(row.detail.loanId)
    } else {
      contentIds[row.detail.targetType].add(row.detail.targetId)
    }
  }

  // Audit lines the member can see always name loans the rule in
  // collections/Log.ts already proved are theirs — numeric ids that exist, so
  // no further validation of the reference is needed here.
  const loanBookIds = new Map<string, string>()
  if (loanIds.size > 0) {
    const loans = await ctx.payload.find({
      collection: 'loans',
      where: { id: { in: [...loanIds] } },
      depth: 0,
      limit: loanIds.size,
      req: ctx.req,
      overrideAccess: true,
    })
    for (const loan of loans.docs) {
      const bookId = String(resolveRelationId(loan.book))
      loanBookIds.set(String(loan.id), bookId)
      contentIds.book.add(bookId)
    }
  }

  const titles = new Map<string, string>()
  const collectionFor: Record<MemberEventTargetType, 'books' | 'activities' | 'articles'> = {
    book: 'books',
    activity: 'activities',
    article: 'articles',
  }
  for (const targetType of ['book', 'activity', 'article'] as const) {
    const ids = [...contentIds[targetType]]
    if (ids.length === 0) continue
    const found = await ctx.payload.find({
      collection: collectionFor[targetType],
      where: { id: { in: ids } },
      // Only the title is rendered; the payload stays out of the query.
      select: { title: true },
      depth: 0,
      limit: ids.length,
      req: ctx.req,
      overrideAccess: true,
    })
    for (const doc of found.docs) titles.set(`${targetType}:${doc.id}`, (doc as Book).title)
  }

  const resolveDetail = (detail: PendingDetail | null): string | undefined => {
    if (!detail) return undefined
    // A loan the lookup did not answer (its row since deleted) leaves the
    // map empty for that id — interpolated to a key no title occupies — so
    // the line renders with no detail rather than a dead title (#178,
    // open question 2).
    if (detail.kind === 'loan') return titles.get(`book:${loanBookIds.get(detail.loanId)}`)
    return titles.get(`${detail.targetType}:${detail.targetId}`)
  }

  const events: ActivityLogEvent[] = pageRows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    source: row.source,
    label: row.label,
    detail: resolveDetail(row.detail),
  }))

  const totalDocs = eventDocs.totalDocs + logDocs.totalDocs

  return {
    groups: groupLogsByDay(events),
    page: safePage,
    totalPages: Math.ceil(totalDocs / safeLimit),
    totalDocs,
  }
}
