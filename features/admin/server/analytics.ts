'use server'

import { getAdminCtx } from './ctx'
import { getAdminPool } from './db-pool'

export interface AnalyticsQuery {
  /** ISO date; defaults to the start of the current year. */
  from?: string
}

/** One book row with the counts the two "most ..." tables need. */
export interface AnalyticsBookRow {
  bookId: number
  title: string
  author: string
  publisher: string | null
  category: string | null
}

export interface AnalyticsResult {
  from: string
  topCategories: Array<{ category: string | null; requests: number }>
  topTypes: Array<{ type: string | null; requests: number }>
  topRequestedBooks: Array<AnalyticsBookRow & { requests: number }>
  /** #156: collected copies, so a refused request never reads as a popular book. */
  topBorrowedBooks: Array<AnalyticsBookRow & { loans: number }>
  /** #156, SPEC §7.8: the borrowings trend is monthly, not daily. */
  monthlyBorrowings: Array<{ month: Date; loans: number }>
  busiestHours: Array<{ hour: number; requests: number }>
  busiestWeekdays: Array<{ weekday: number; requests: number }>
  /** #156, SPEC §7.8: when pickups happen, by hour and by weekday. */
  pickupHours: Array<{ hour: number; pickups: number }>
  pickupWeekdays: Array<{ weekday: number; pickups: number }>
  /** #156: member reads, reviews and bookmarks per article. */
  articleEngagement: Array<{
    articleId: number
    title: string
    type: string | null
    reads: number
    reviews: number
    favorites: number
    interactions: number
  }>
  topArticleByInteraction: {
    articleId: number
    title: string
    type: string | null
    reads: number
    reviews: number
    favorites: number
    interactions: number
  } | null
  activityRegistrations: Array<{ activityId: number; title: string; registrations: number }>
  activityFeedback: Array<{
    activityId: number
    title: string
    positive: number
    negative: number
  }>
}

/**
 * Loans-based admin analytics (#103, extended in #156). Everything is a Postgres
 * aggregation over rows this platform wrote — there is no external analytics
 * service in this project (CONTEXT.md, Analytics), so a metric that has no rows
 * behind it is not reported at all rather than approximated.
 *
 * Two honest limits, both visible in the UI:
 *
 * - Article reads come from the `article_reads` counter and count members only
 *   (`recordArticleRead` skips anonymous readers), so article engagement is
 *   reported all-time rather than sliced by `from`: a cumulative counter cannot
 *   be honestly split across periods.
 * - Overdue is never stored, so nothing here invents an "overdue" series. The
 *   pickup peaks are read from `loans.pickupDate`: the slot the loan was
 *   accepted for (the day the member asked for, defaulting to the moment of
 *   acceptance) — so they say when the counter was busy, not when people read.
 */
export async function getAdminAnalytics(query: AnalyticsQuery = {}): Promise<AnalyticsResult> {
  const db = await getAdminPool()

  const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 0, 1)
  const fromISO = from.toISOString()

  const [
    categories,
    types,
    books,
    borrowedBooks,
    months,
    hours,
    weekdays,
    pickupHours,
    pickupWeekdays,
    articleEngagement,
    activityRegistrations,
    activityFeedback,
  ] = await Promise.all([
    db.query(
      `SELECT b.category AS category, COUNT(*)::int AS requests
         FROM loans l
         JOIN books b ON b.id = l.book_id
        WHERE l.loan_date >= $1
        GROUP BY b.category
        ORDER BY requests DESC, category ASC`,
      [fromISO],
    ),
    db.query(
      `SELECT bt.value AS type, COUNT(*)::int AS requests
         FROM loans l
         JOIN books b ON b.id = l.book_id
         JOIN books_type bt ON bt.parent_id = b.id
        WHERE l.loan_date >= $1
        GROUP BY bt.value
        ORDER BY requests DESC, type ASC`,
      [fromISO],
    ),
    db.query(
      `SELECT b.id AS "bookId", b.title AS title, b.author AS author,
              b.publisher AS publisher, b.category AS category,
              COUNT(*)::int AS requests
         FROM loans l
         JOIN books b ON b.id = l.book_id
        WHERE l.loan_date >= $1
        GROUP BY b.id, b.title, b.author, b.publisher, b.category
        ORDER BY requests DESC, title ASC
        LIMIT 10`,
      [fromISO],
    ),
    // Collected copies only: a `pending` or `refused` row is a request, not a
    // borrowing, and mixing the two would rank a book nobody ever took.
    db.query(
      `SELECT b.id AS "bookId", b.title AS title, b.author AS author,
              b.publisher AS publisher, b.category AS category,
              COUNT(*)::int AS loans
         FROM loans l
         JOIN books b ON b.id = l.book_id
        WHERE l.loan_date >= $1
          AND l.status IN ('picked_up', 'returned')
        GROUP BY b.id, b.title, b.author, b.publisher, b.category
        ORDER BY loans DESC, title ASC
        LIMIT 10`,
      [fromISO],
    ),
    db.query(
      `SELECT date_trunc('month', l.loan_date) AS month, COUNT(*)::int AS loans
         FROM loans l
        WHERE l.loan_date >= $1
        GROUP BY date_trunc('month', l.loan_date)
        ORDER BY month ASC`,
      [fromISO],
    ),
    db.query(
      `SELECT EXTRACT(HOUR FROM l.loan_date AT TIME ZONE 'Africa/Algiers')::int AS hour,
              COUNT(*)::int AS requests
         FROM loans l
        WHERE l.loan_date >= $1
          AND EXTRACT(HOUR FROM l.loan_date AT TIME ZONE 'Africa/Algiers') BETWEEN 8 AND 17
        GROUP BY 1
        ORDER BY 1`,
      [fromISO],
    ),
    db.query(
      `SELECT EXTRACT(ISODOW FROM l.loan_date AT TIME ZONE 'Africa/Algiers')::int AS weekday,
              COUNT(*)::int AS requests
         FROM loans l
        WHERE l.loan_date >= $1
        GROUP BY 1
        ORDER BY 1`,
      [fromISO],
    ),
    db.query(
      `SELECT EXTRACT(HOUR FROM l.pickup_date AT TIME ZONE 'Africa/Algiers')::int AS hour,
              COUNT(*)::int AS pickups
         FROM loans l
        WHERE l.pickup_date >= $1
        GROUP BY 1
        ORDER BY 1`,
      [fromISO],
    ),
    db.query(
      `SELECT EXTRACT(ISODOW FROM l.pickup_date AT TIME ZONE 'Africa/Algiers')::int AS weekday,
              COUNT(*)::int AS pickups
         FROM loans l
        WHERE l.pickup_date >= $1
        GROUP BY 1
        ORDER BY 1`,
      [fromISO],
    ),
    // Reads are a counter, so this one is all-time on purpose (see the note
    // above). Only articles with at least one interaction are listed: a table of
    // zeroes is not an insight.
    db.query(`
      SELECT a.id AS "articleId", a.title AS title, a.type AS type,
             COALESCE(reads.total, 0)::int AS reads,
             COALESCE(rv.total, 0)::int AS reviews,
             COALESCE(fv.total, 0)::int AS favorites,
             (COALESCE(reads.total, 0) + COALESCE(rv.total, 0) + COALESCE(fv.total, 0))::int AS interactions
        FROM articles a
        LEFT JOIN (
          SELECT article_id, SUM(read_count) AS total FROM article_reads GROUP BY article_id
        ) reads ON reads.article_id = a.id
        LEFT JOIN (
          SELECT article_id, COUNT(*) AS total FROM reviews WHERE article_id IS NOT NULL GROUP BY article_id
        ) rv ON rv.article_id = a.id
        LEFT JOIN (
          SELECT article_id, COUNT(*) AS total FROM article_favorites GROUP BY article_id
        ) fv ON fv.article_id = a.id
       WHERE COALESCE(reads.total, 0) + COALESCE(rv.total, 0) + COALESCE(fv.total, 0) > 0
       ORDER BY interactions DESC, a.title ASC
       LIMIT 10
    `),
    db.query(
      `SELECT ac.id AS "activityId", ac.title AS title, COUNT(ar.id)::int AS registrations
         FROM activity_registrations ar
         JOIN activities ac ON ac.id = ar.activity_id
        WHERE ar.created_at >= $1
        GROUP BY ac.id, ac.title
        ORDER BY registrations DESC, ac.title ASC
        LIMIT 10`,
      [fromISO],
    ),
    db.query(
      `SELECT ac.id AS "activityId", ac.title AS title,
              COUNT(*) FILTER (WHERE af.sentiment = 'positive')::int AS positive,
              COUNT(*) FILTER (WHERE af.sentiment = 'negative')::int AS negative
         FROM activity_feedback af
         JOIN activities ac ON ac.id = af.activity_id
        WHERE af.created_at >= $1
        GROUP BY ac.id, ac.title
        ORDER BY (COUNT(*) FILTER (WHERE af.sentiment = 'positive')
                + COUNT(*) FILTER (WHERE af.sentiment = 'negative')) DESC, ac.title ASC
        LIMIT 10`,
      [fromISO],
    ),
  ])

  const engagement = articleEngagement.rows as AnalyticsResult['articleEngagement']

  return {
    from: fromISO,
    topCategories: categories.rows,
    topTypes: types.rows,
    topRequestedBooks: books.rows,
    topBorrowedBooks: borrowedBooks.rows,
    monthlyBorrowings: months.rows,
    busiestHours: hours.rows,
    busiestWeekdays: weekdays.rows,
    pickupHours: pickupHours.rows,
    pickupWeekdays: pickupWeekdays.rows,
    articleEngagement: engagement,
    topArticleByInteraction: engagement[0] ?? null,
    activityRegistrations: activityRegistrations.rows,
    activityFeedback: activityFeedback.rows,
  }
}
