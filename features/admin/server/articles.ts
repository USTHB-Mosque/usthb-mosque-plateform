'use server'

import { revalidatePath } from 'next/cache'
import { getStaffCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import type { Payload } from 'payload'
import type { Article, User } from '@/payload-types'

type ArticleFormData = {
  title: string
  publishDate?: string
  type: NonNullable<Article['type']>
  author: string
  tags?: Article['tags']
  description: string
  content?: NonNullable<Article['content']>
}

function parseArticleFields(formData: FormData): ArticleFormData {
  const title = formData.get('title') as string
  const type = formData.get('type') as string | null
  const author = formData.get('author') as string
  const description = formData.get('description') as string
  const publishDate = formData.get('publishDate') as string | null
  const contentRaw = formData.get('content') as string | null
  const tagsRaw = formData.get('tags') as string | null

  const tags = tagsRaw ? (JSON.parse(tagsRaw) as NonNullable<Article['tags']>) : undefined

  return {
    title,
    publishDate: publishDate || undefined,
    type: type as NonNullable<Article['type']>,
    author,
    tags,
    description,
    content: contentRaw ? (JSON.parse(contentRaw) as NonNullable<Article['content']>) : undefined,
  }
}

async function uploadArticleImage(
  payload: Payload,
  imageRaw: FormDataEntryValue | null,
  user: User,
  alt: string,
): Promise<number | undefined> {
  if (!(imageRaw instanceof File) || imageRaw.size === 0) return undefined

  const arrayBuffer = await imageRaw.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mediaDoc = await payload.create({
    collection: 'media',
    data: { alt },
    file: {
      data: buffer,
      mimetype: imageRaw.type,
      name: imageRaw.name,
      size: buffer.byteLength,
    },
    req: { user },
    overrideAccess: false,
  })
  return mediaDoc.id
}

export async function getAdminArticlesStats() {
  const { payload, user } = await getStaffCtx()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastSevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [total, thisMonth, lastWeek] = await Promise.all([
    payload.count({ collection: 'articles', overrideAccess: false, user }),
    payload.count({
      collection: 'articles',
      where: { createdAt: { greater_than_equal: startOfMonth } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'articles',
      where: { createdAt: { greater_than_equal: lastSevenDays } },
      overrideAccess: false,
      user,
    }),
  ])

  return {
    stats: {
      totalArticles: total.totalDocs,
      thisMonthArticles: thisMonth.totalDocs,
      lastSevenDaysArticles: lastWeek.totalDocs,
    },
  }
}

export async function createArticle(formData: FormData) {
  const { payload, user } = await getStaffCtx()

  const fields = parseArticleFields(formData)
  const imageId = await uploadArticleImage(payload, formData.get('image'), user, fields.title)
  if (!imageId) throw new Error('صورة المقال مطلوبة')

  const article = await payload.create({
    collection: 'articles',
    data: {
      ...fields,
      image: imageId,
    },
    req: { user },
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/articles')
  revalidatePath('/articles')
  await writeLog(payload, user, {
    action: LogAction.ArticleCreated,
    targetType: 'article',
    targetId: article.id,
    message: `أضاف مقالاً: ${article.title}`,
  })
  return { ok: true, articleId: article.id }
}

export async function updateArticle(articleId: number, formData: FormData) {
  const { payload, user } = await getStaffCtx()

  const fields = parseArticleFields(formData)
  const imageId = await uploadArticleImage(payload, formData.get('image'), user, fields.title)

  const article = await payload.update({
    collection: 'articles',
    id: articleId,
    data: {
      ...fields,
      ...(imageId ? { image: imageId } : {}),
    },
    req: { user },
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/articles')
  revalidatePath(`/admin-panel/articles/${articleId}`)
  await writeLog(payload, user, {
    action: LogAction.ArticleUpdated,
    targetType: 'article',
    targetId: articleId,
    message: `عدّل مقالاً: ${article.title}`,
  })
  return { ok: true, articleId: article.id }
}

export async function getAdminArticle(articleId: number | string) {
  const { payload, user } = await getStaffCtx()

  const doc = await payload.findByID({
    collection: 'articles',
    id: articleId as number,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return doc
}

export async function deleteArticle(articleId: number) {
  const { payload, user } = await getStaffCtx()

  let article
  try {
    article = await payload.findByID({
      collection: 'articles',
      id: articleId,
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false as const, error: 'تعذر حذف المقال، حاول مرة أخرى.' }
  }

  try {
    await payload.delete({
      collection: 'articles',
      id: articleId,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false as const, error: 'تعذر حذف المقال، حاول مرة أخرى.' }
  }

  revalidatePath('/admin-panel/articles')
  await writeLog(payload, user, {
    action: LogAction.ArticleDeleted,
    targetType: 'article',
    targetId: articleId,
    message: `حذف مقال: ${article.title}`,
  })
  return { ok: true as const }
}

export async function bulkDeleteArticles(articleIds: number[]) {
  if (articleIds.length === 0) return { ok: true as const, count: 0 }

  const { payload, user } = await getStaffCtx()

  const result = await payload.delete({
    collection: 'articles',
    where: { id: { in: articleIds } },
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin-panel/articles')
  await writeLog(payload, user, {
    action: LogAction.ArticleDeleted,
    targetType: 'article',
    message: `حذف ${result.docs.length} مقالاً`,
  })
  return { ok: result.errors.length === 0, count: result.docs.length }
}
