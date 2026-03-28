'use server'

import { getPayloadWithUser } from '@/lib/server/payload-auth'
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

export async function updateProfileFullName(formData: FormData) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const fullName = (formData.get('fullName') as string)?.trim()
  if (!fullName) return { ok: false as const, error: 'الاسم مطلوب' }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { fullName },
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/profile')
  return { ok: true as const }
}

export async function changePassword(formData: FormData) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const current = formData.get('currentPassword') as string
  const next = formData.get('newPassword') as string
  const confirm = formData.get('confirmPassword') as string
  if (!next || next.length < 8) {
    return { ok: false as const, error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }
  }
  if (next !== confirm) return { ok: false as const, error: 'تأكيد كلمة المرور غير متطابق' }

  try {
    await ctx.payload.login({
      collection: 'users',
      data: {
        email: ctx.user.email,
        password: current,
      },
    })
  } catch {
    return { ok: false as const, error: 'كلمة المرور الحالية غير صحيحة' }
  }

  await ctx.payload.update({
    collection: 'users',
    id: ctx.user.id,
    data: { password: next },
    req: ctx.req,
    overrideAccess: false,
  })
  revalidatePath('/profile')
  return { ok: true as const }
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
    revalidatePath('/profile')
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
  revalidatePath('/profile')
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
  revalidatePath('/profile')
  return { ok: true as const }
}
