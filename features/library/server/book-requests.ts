'use server'

import { revalidatePath } from 'next/cache'
import { getPayloadWithUser, type ActionCtx } from '@/shared/lib/auth'

export type BookRequestInput = { title: string; author?: string; description?: string }

export async function submitBookRequestLogic(input: BookRequestInput, ctx: ActionCtx) {
  const title = input.title.trim()
  if (!title) return { ok: false as const, error: 'عنوان الكتاب مطلوب' }
  try {
    const doc = await ctx.payload.create({
      collection: 'book-requests',
      data: {
        user: ctx.user.id,
        title,
        author: input.author?.trim() || undefined,
        description: input.description?.trim() || undefined,
        status: 'pending',
      },
      req: ctx.req,
      overrideAccess: false,
    })
    return { ok: true as const, id: doc.id }
  } catch {
    return { ok: false as const, error: 'تعذر إرسال طلب الكتاب' }
  }
}

export async function submitBookRequest(input: BookRequestInput) {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return { ok: false as const, error: 'يجب تسجيل الدخول أولاً' }
  const result = await submitBookRequestLogic(input, ctx)
  if (result.ok) revalidatePath('/library/book-requests')
  return result
}

export async function getMyBookRequests() {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return []
  const result = await ctx.payload.find({
    collection: 'book-requests',
    where: { user: { equals: ctx.user.id } },
    req: ctx.req,
    overrideAccess: false,
    sort: '-createdAt',
    limit: 100,
    depth: 0,
  })
  return result.docs.map(({ id, title, author, status, adminNote, createdAt }) => ({
    id,
    title,
    author,
    status,
    adminNote,
    createdAt,
  }))
}
