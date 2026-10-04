'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getArticleFavoriteState(articleId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { favorited: false }
  const existing = await ctx.payload.find({
    collection: 'article-favorites',
    where: {
      and: [{ user: { equals: ctx.user.id } }, { article: { equals: articleId } }],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })
  return { favorited: Boolean(existing.docs[0]) }
}

export async function toggleArticleFavorite(articleId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'يجب تسجيل الدخول', favorited: false }

  const existing = await ctx.payload.find({
    collection: 'article-favorites',
    where: {
      and: [{ user: { equals: ctx.user.id } }, { article: { equals: articleId } }],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })

  if (existing.docs[0]) {
    await ctx.payload.delete({
      collection: 'article-favorites',
      id: existing.docs[0].id,
      req: ctx.req,
      overrideAccess: false,
    })
    revalidatePath('/user/bookmarks')
    return { ok: true as const, favorited: false }
  }

  await ctx.payload.create({
    collection: 'article-favorites',
    data: {
      article: articleId,
      user: ctx.user.id,
    },
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/user/bookmarks')
  return { ok: true as const, favorited: true }
}

export async function removeArticleFavorite(favoriteId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  await ctx.payload.delete({
    collection: 'article-favorites',
    id: favoriteId,
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/user/bookmarks')
  return { ok: true as const }
}
