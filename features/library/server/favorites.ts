'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getBookFavoriteState(bookId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { favorited: false }
  const existing = await ctx.payload.find({
    collection: 'book-favorites',
    where: {
      and: [{ user: { equals: ctx.user.id } }, { book: { equals: bookId } }],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })
  return { favorited: Boolean(existing.docs[0]) }
}

export async function toggleBookFavorite(bookId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'يجب تسجيل الدخول', favorited: false }

  const existing = await ctx.payload.find({
    collection: 'book-favorites',
    where: {
      and: [{ user: { equals: ctx.user.id } }, { book: { equals: bookId } }],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })

  if (existing.docs[0]) {
    await ctx.payload.delete({
      collection: 'book-favorites',
      id: existing.docs[0].id,
      req: ctx.req,
      overrideAccess: false,
    })
    revalidatePath('/user/dashboard')
    revalidatePath('/user/bookmarks')
    revalidatePath('/library')
    return { ok: true as const, favorited: false }
  }

  await ctx.payload.create({
    collection: 'book-favorites',
    data: {
      book: bookId,
      user: ctx.user.id,
    },
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/user/dashboard')
  revalidatePath('/user/bookmarks')
  revalidatePath('/library')
  return { ok: true as const, favorited: true }
}

export async function removeBookFavorite(favoriteId: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  await ctx.payload.delete({
    collection: 'book-favorites',
    id: favoriteId,
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/user/dashboard')
  revalidatePath('/user/bookmarks')
  return { ok: true as const }
}
