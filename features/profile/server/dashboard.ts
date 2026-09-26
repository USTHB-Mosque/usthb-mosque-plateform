'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { syncOverdueLoans } from '@/features/library'

export async function getProfileDashboardData() {
  const ctx = await getPayloadWithUser()
  if (!ctx) return null

  // Lazy overdue check on read (#19): stamp + notify exactly once before the
  // loans are fetched, so the member sees fresh derived overdue states.
  await syncOverdueLoans(ctx)

  const fullUser = await ctx.payload.findByID({
    collection: 'users',
    id: ctx.user.id,
    depth: 2,
    req: ctx.req,
    overrideAccess: false,
  })

  const [favorites, articleFavorites, registrations, loans, articles, activities] =
    await Promise.all([
      ctx.payload.find({
        collection: 'book-favorites',
        where: { user: { equals: ctx.user.id } },
        depth: 2,
        limit: 100,
        sort: '-createdAt',
        req: ctx.req,
        overrideAccess: false,
      }),
      ctx.payload.find({
        collection: 'article-favorites',
        where: { user: { equals: ctx.user.id } },
        depth: 2,
        limit: 100,
        sort: '-createdAt',
        req: ctx.req,
        overrideAccess: false,
      }),
      ctx.payload.find({
        collection: 'activity-registrations',
        where: { user: { equals: ctx.user.id } },
        depth: 2,
        limit: 100,
        sort: '-createdAt',
        req: ctx.req,
        overrideAccess: false,
      }),
      ctx.payload.find({
        collection: 'loans',
        where: { user: { equals: ctx.user.id } },
        depth: 2,
        limit: 100,
        sort: '-createdAt',
        req: ctx.req,
        overrideAccess: false,
      }),
      ctx.payload.find({
        collection: 'articles',
        depth: 1,
        limit: 3,
        sort: '-createdAt',
        req: ctx.req,
        overrideAccess: false,
      }),
      ctx.payload.find({
        collection: 'activities',
        depth: 1,
        limit: 100,
        sort: 'startDate',
        req: ctx.req,
        overrideAccess: false,
      }),
    ])

  return {
    user: fullUser,
    favorites: favorites.docs,
    articleFavorites: articleFavorites.docs,
    registrations: registrations.docs,
    loans: loans.docs,
    articles: articles.docs,
    activities: activities.docs,
  }
}
