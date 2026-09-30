'use server'

import type { Pool } from 'pg'
import { getAdminCtx } from './ctx'

export interface AnalyticsQuery {
  /** ISO date; defaults to the start of the current year. */
  from?: string
}

export interface AnalyticsResult {
  from: string
  topCategories: Array<{ category: string | null; requests: number }>
  topTypes: Array<{ type: string | null; requests: number }>
  topRequestedBooks: Array<{
    bookId: number
    title: string
    author: string
    publisher: string | null
    category: string | null
    requests: number
  }>
  busiestDays: Array<{ day: Date; requests: number }>
  busiestHours: Array<{ hour: number; requests: number }>
  busiestWeekdays: Array<{ weekday: number; requests: number }>
}

/**
 * Loans-based admin analytics (#103). "Read" means loan requests: every
 * aggregation counts `loans` rows grouped over their `loanDate`. Raw SQL over
 * the postgres pool is intentionally used so the date_trunc / GROUP BY shapes
 * and their indexes match the requirement (no external analytics service).
 */
export async function getAdminAnalytics(query: AnalyticsQuery = {}): Promise<AnalyticsResult> {
  const ctx = await getAdminCtx()

  const db = (ctx.payload.db as unknown as { pool?: Pool }).pool
  if (!db) throw new Error('تتطلب الإحصائيات قاعدة بيانات بوستغرس')

  const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 0, 1)
  const fromISO = from.toISOString()

  const [categories, types, books, days, hours, weekdays] = await Promise.all([
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
    db.query(
      `SELECT date_trunc('day', l.loan_date) AS day, COUNT(*)::int AS requests
         FROM loans l
        WHERE l.loan_date >= $1
        GROUP BY date_trunc('day', l.loan_date)
        ORDER BY day ASC`,
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
  ])

  return {
    from: fromISO,
    topCategories: categories.rows,
    topTypes: types.rows,
    topRequestedBooks: books.rows,
    busiestDays: days.rows,
    busiestHours: hours.rows,
    busiestWeekdays: weekdays.rows,
  }
}
