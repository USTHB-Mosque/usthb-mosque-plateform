'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'

export async function getLatestUpdates() {
  const ctx = await getPayloadWithUser()
  if (!ctx) return null

  const [articles, activities] = await Promise.all([
    ctx.payload.find({
      collection: 'articles',
      depth: 1,
      limit: 5,
      sort: '-createdAt',
      req: ctx.req,
      overrideAccess: false,
    }),
    ctx.payload.find({
      collection: 'activities',
      depth: 1,
      limit: 4,
      sort: '-createdAt',
      req: ctx.req,
      overrideAccess: false,
    }),
  ])

  return {
    articles: articles.docs,
    activities: activities.docs,
  }
}