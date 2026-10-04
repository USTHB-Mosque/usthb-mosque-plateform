'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import { getAdminCtx } from './ctx'
import { getPayloadPool } from './db-pool'

/** One row out of the aggregate above: `AVG` over `numeric` comes back a string. */
interface ReviewAverages {
  average: string | null
  book_average: string | null
  article_average: string | null
  book_reviews: number
  article_reviews: number
}

/** `numeric` columns come back as strings; the KPI cards render a number. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

export interface ReviewKpis {
  totalReviews: number
  positiveReviews: number
  negativeReviews: number
  positivePercent: number
  negativePercent: number
  /** #156, SPEC §7.10: an average per category, not totals and sentiment only. */
  averageRating: number
  bookReviews: number
  bookAverageRating: number
  articleReviews: number
  articleAverageRating: number
}

export async function getReviewKpis(): Promise<ReviewKpis> {
  const { payload, user } = await getAdminCtx()
  const pool = getPayloadPool(payload)

  const [total, positive, negative, positiveRatio, averagesResult] = await Promise.all([
    payload.count({ collection: 'reviews', where: {}, overrideAccess: false, user }),
    payload.count({
      collection: 'reviews',
      where: { rating: { greater_than_equal: 4 } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'reviews',
      where: { rating: { less_than_equal: 2 } },
      overrideAccess: false,
      user,
    }),
    // Fraction of pole opinions (positive / non-neutral) as an int 0-100.
    payload.count({
      collection: 'reviews',
      where: { rating: { not_in: [3] } },
      overrideAccess: false,
      user,
    }),
    // Counts are cheap through the API, averages are not: one aggregate over
    // the rows, split per target by the same `book_id IS NOT NULL` rule the
    // rest of the codebase uses (there is no discriminator column).
    pool.query(`
      SELECT AVG(rating) AS average,
             COUNT(*) FILTER (WHERE book_id IS NOT NULL)::int AS book_reviews,
             AVG(rating) FILTER (WHERE book_id IS NOT NULL) AS book_average,
             COUNT(*) FILTER (WHERE article_id IS NOT NULL)::int AS article_reviews,
             AVG(rating) FILTER (WHERE article_id IS NOT NULL) AS article_average
        FROM reviews
    `),
  ])

  const pole = positiveRatio.totalDocs || 0
  // No GROUP BY, so the aggregate is one row by definition — even over an empty
  // table, where the averages come back null and `toNumber` reads as 0.
  const [averages] = averagesResult.rows as [ReviewAverages]

  return {
    totalReviews: total.totalDocs,
    positiveReviews: positive.totalDocs,
    negativeReviews: negative.totalDocs,
    positivePercent: pole === 0 ? 0 : Math.round((positive.totalDocs / pole) * 100),
    negativePercent: pole === 0 ? 0 : Math.round((negative.totalDocs / pole) * 100),
    averageRating: toNumber(averages.average),
    bookReviews: toNumber(averages.book_reviews),
    bookAverageRating: toNumber(averages.book_average),
    articleReviews: toNumber(averages.article_reviews),
    articleAverageRating: toNumber(averages.article_average),
  }
}

export interface ReviewsQuery {
  targetType?: 'book' | 'article'
  page?: number
  limit?: number
}

export async function getAdminReviews(query: ReviewsQuery = {}) {
  const { payload, user } = await getAdminCtx()

  const where: Where =
    query.targetType === 'article'
      ? { article: { exists: true } }
      : query.targetType === 'book'
        ? { book: { exists: true } }
        : {}

  return payload.find({
    collection: 'reviews',
    where,
    depth: 2,
    sort: '-createdAt',
    page: query.page || 1,
    limit: query.limit || 20,
    overrideAccess: false,
    user,
  })
}

export async function deleteReview(reviewId: number | string) {
  const ctx = await getAdminCtx()

  const review = await ctx.payload.findByID({
    collection: 'reviews',
    id: Number(reviewId),
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })

  await ctx.payload.delete({
    collection: 'reviews',
    id: Number(reviewId),
    overrideAccess: false,
    user: ctx.user,
    req: ctx.req,
  })

  await writeLog(ctx.payload, ctx.user, {
    action: LogAction.ReviewDeleted,
    targetType: review.book ? 'book' : 'article',
    targetId: (review.book ?? review.article) as never,
    message: `حذف تقييم ${review.book ? 'كتاب' : 'مقال'} (${review.rating}/5)`,
  })

  revalidatePath('/admin-panel/reviews')
  return { ok: true }
}

/**
 * #156, SPEC §7.10: the second admin action on a review. It re-publishes the
 * same rating and comment against the same target as a new row — it does not
 * edit the original, so the member's own review stays on the record exactly as
 * they left it.
 *
 * The copy is attributed to the admin who made it, because that is what the row
 * then says: a review is somebody's opinion, and pretending an admin's copy was
 * a member's would misattribute it. The UI confirms before firing so the name
 * is never a surprise.
 */
export async function copyReview(
  reviewId: number | string,
): Promise<{ ok: boolean; reviewId?: number; error?: string }> {
  const ctx = await getAdminCtx()

  let source
  try {
    source = await ctx.payload.findByID({
      collection: 'reviews',
      id: Number(reviewId),
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    })
  } catch {
    return { ok: false, error: 'التقييم غير موجود' }
  }

  const isBook = Boolean(source.book)

  try {
    const copy = await ctx.payload.create({
      collection: 'reviews',
      data: {
        ...(isBook ? { book: source.book } : { article: source.article }),
        rating: source.rating,
        ...(source.comment ? { comment: source.comment } : {}),
        user: ctx.user.id,
      },
      overrideAccess: false,
      user: ctx.user,
      req: ctx.req,
    })

    await writeLog(ctx.payload, ctx.user, {
      action: LogAction.ReviewCopied,
      targetType: isBook ? 'book' : 'article',
      targetId: (isBook ? source.book : source.article) as never,
      message: `نسخ تقييم ${isBook ? 'كتاب' : 'مقال'} (${source.rating}/5)`,
      metadata: { sourceReview: Number(reviewId) },
    })

    revalidatePath('/admin-panel/reviews')
    return { ok: true, reviewId: copy.id }
  } catch {
    return { ok: false, error: 'تعذر نسخ التقييم' }
  }
}
