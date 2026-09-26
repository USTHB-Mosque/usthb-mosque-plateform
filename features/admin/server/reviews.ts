'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import { getAdminCtx } from './ctx'

export async function getReviewKpis() {
  const { payload, user } = await getAdminCtx()

  const [total, positive, negative, positiveRatio] = await Promise.all([
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
  ])

  const pole = positiveRatio.totalDocs || 0
  return {
    totalReviews: total.totalDocs,
    positiveReviews: positive.totalDocs,
    negativeReviews: negative.totalDocs,
    positivePercent: pole === 0 ? 0 : Math.round((positive.totalDocs / pole) * 100),
    negativePercent: pole === 0 ? 0 : Math.round((negative.totalDocs / pole) * 100),
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
