'use server'

import { getPayloadWithUser } from '@/lib/auth'

export async function getProfileDashboardData() {
  const ctx = await getPayloadWithUser()
  if (!ctx) return null

  const fullUser = await ctx.payload.findByID({
    collection: 'users',
    id: ctx.user.id,
    depth: 2,
    req: ctx.req,
    overrideAccess: false,
  })

  const [favorites, registrations, loans] = await Promise.all([
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
  ])

  return {
    user: fullUser,
    favorites: favorites.docs,
    registrations: registrations.docs,
    loans: loans.docs,
  }
}
