'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { expirePickupWindows, syncOverdueLoans } from '@/features/library'

export async function getProfileDashboardData() {
  const ctx = await getPayloadWithUser()
  if (!ctx) return null

  // Lazy overdue check on read (#19): stamp + notify exactly once before the
  // loans are fetched, so the member sees fresh derived overdue states.
  await syncOverdueLoans(ctx)

  // The other half of the same safety net (#153, D1): the scheduled sweep is
  // the normal path, but a member opening "إعاراتي" must never be shown a
  // collection window that has already lapsed — so the read that surfaces
  // pickup state drains the queue too, ahead of the query below.
  await expirePickupWindows(ctx)

  const fullUser = await ctx.payload.findByID({
    collection: 'users',
    id: ctx.user.id,
    depth: 2,
    req: ctx.req,
    overrideAccess: false,
  })

  const [favorites, articleFavorites, registrations, loans, articles, activities, extensions] =
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
      // D6 (#153): the member table swaps "request extension" for "withdraw
      // extension" while one is still waiting on the administration, so the read
      // that surfaces the loans has to surface that state too. Newest first, so
      // the first match for a loan is its latest request — the one the table
      // should decide on. Returned raw like every other field here; the table
      // owns its own lookup.
      ctx.payload.find({
        collection: 'loan-extensions',
        depth: 0,
        limit: 100,
        sort: '-createdAt',
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
    extensions: extensions.docs,
  }
}
