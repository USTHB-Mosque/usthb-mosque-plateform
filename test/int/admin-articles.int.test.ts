import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  bulkDeleteArticles,
  createArticle,
  deleteArticle,
  getAdminArticle,
  getAdminArticlesStats,
  updateArticle,
} from '@/features/admin/server/articles'

import type { Payload } from 'payload'
import type { Article, User } from '@/payload-types'

let payload: Payload
let admin: User

function contentState(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'rtl',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          textFormat: 0,
          direction: null,
          format: '',
          indent: 0,
          children: [
            { type: 'text', version: 1, detail: 0, format: 0, mode: 'normal', style: '', text },
          ],
        },
      ],
    },
  }
}

function contentTextFrom(article: Article) {
  const nodes = (article.content?.root as { children: unknown[] } | undefined)?.children ?? []
  const texts: string[] = []
  for (const node of nodes) {
    const children = (node as { children?: { text?: string }[] })?.children ?? []
    for (const child of children) {
      if (child.text) texts.push(child.text)
    }
  }
  return texts.join('\n')
}

function articleFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('title', 'فضائل الطهارة')
  fd.set('type', 'fiqh')
  fd.set('author', 'أحمد بن محمد')
  fd.set('description', 'مقال عن فضائل الطهارة في الإسلام')
  fd.set('publishDate', '2026-09-01')
  fd.set('content', JSON.stringify(contentState('محتوى المقال')))
  fd.set('tags', JSON.stringify([{ name: 'الطهارة' }, { name: 'الفقه' }]))
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value)
  return fd
}

function imageFile() {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return new File([Buffer.from(base64, 'base64')], 'article.png', { type: 'image/png' })
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await createTestUser(payload, { role: 'admin', email: 'admin@articles-int.usthb.dz' })

  const { token } = await loginToken(payload, {
    email: admin.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))

  vi.spyOn(payload, 'sendEmail').mockImplementation(async () => undefined)
})

afterAll(async () => {
  await payload.db.destroy?.()
})

async function articleById(articleId: number, depth = 0): Promise<Article> {
  return payload.findByID({ collection: 'articles', id: articleId, overrideAccess: true, depth })
}

describe('getAdminArticlesStats', () => {
  it('starts at zero and grows as articles are published', async () => {
    const empty = await getAdminArticlesStats()
    expect(empty.stats).toEqual({
      totalArticles: 0,
      thisMonthArticles: 0,
      lastSevenDaysArticles: 0,
    })

    const fd = articleFormData()
    fd.set('image', imageFile())
    await createArticle(fd)

    const stats = await getAdminArticlesStats()
    expect(stats.stats.totalArticles).toBe(1)
    expect(stats.stats.thisMonthArticles).toBe(1)
    expect(stats.stats.lastSevenDaysArticles).toBe(1)
  })
})

describe('createArticle', () => {
  it('creates an article with all basic fields', async () => {
    const fd = articleFormData()
    fd.set('image', imageFile())

    const result = await createArticle(fd)

    expect(result.ok).toBe(true)
    const articleId = (result as { articleId: number }).articleId
    const article = await articleById(articleId)
    expect(article.title).toBe('فضائل الطهارة')
    expect(article.type).toBe('fiqh')
    expect(article.author).toBe('أحمد بن محمد')
    expect(article.description).toBe('مقال عن فضائل الطهارة في الإسلام')
    expect(new Date(article.publishDate ?? '').toISOString().startsWith('2026-09-01')).toBe(true)
    expect(article.tags?.map((tag) => tag.name)).toEqual(['الطهارة', 'الفقه'])
  })

  it('stores the content as lexical rich text', async () => {
    const fd = articleFormData({ content: JSON.stringify(contentState('فضل الوضوء والنظافة')) })
    fd.set('image', imageFile())

    const result = await createArticle(fd)

    const articleId = (result as { articleId: number }).articleId
    const article = await articleById(articleId)
    expect(contentTextFrom(article)).toBe('فضل الوضوء والنظافة')
  })

  it('uploads the image and links it to the article', async () => {
    const fd = articleFormData()
    fd.set('image', imageFile())

    const result = await createArticle(fd)

    const articleId = (result as { articleId: number }).articleId
    const article = await articleById(articleId, 1)
    expect((article.image as { id: number } | undefined)?.id).toBeTruthy()
  })

  it('rejects creation without an image', async () => {
    await expect(createArticle(articleFormData())).rejects.toThrow('صورة المقال مطلوبة')
  })
})

describe('updateArticle', () => {
  it('replaces the image when a new file is uploaded', async () => {
    const fd = articleFormData()
    fd.set('image', imageFile())
    const created = (await createArticle(fd)) as { articleId: number }
    const before = await articleById(created.articleId, 1)
    const oldImageId = (before.image as { id: number }).id

    const updateFd = articleFormData({ title: 'عنوان معدل' })
    updateFd.set('image', imageFile())
    const result = await updateArticle(created.articleId, updateFd)

    expect(result.ok).toBe(true)
    const after = await articleById(created.articleId, 1)
    expect(after.title).toBe('عنوان معدل')
    expect((after.image as { id: number }).id).not.toBe(oldImageId)
  })

  it('keeps the image when no new file is sent', async () => {
    const fd = articleFormData()
    fd.set('image', imageFile())
    const created = (await createArticle(fd)) as { articleId: number }
    const oldImageId = (await articleById(created.articleId, 1)).image as { id: number }

    const updateFd = articleFormData({ author: 'محمد الثاني' })
    const result = await updateArticle(created.articleId, updateFd)

    expect(result.ok).toBe(true)
    const after = await articleById(created.articleId, 1)
    expect(after.author).toBe('محمد الثاني')
    expect((after.image as { id: number }).id).toBe(oldImageId.id)
  })
})

describe('getAdminArticle', () => {
  it('returns the article with populated relations', async () => {
    const fd = articleFormData()
    fd.set('image', imageFile())
    const created = (await createArticle(fd)) as { articleId: number }

    const article = await getAdminArticle(created.articleId)

    expect(article.id).toBe(created.articleId)
    expect((article.image as { id: number } | undefined)?.id).toBeTruthy()
  })
})

describe('deleteArticle', () => {
  it('deletes the article entirely', async () => {
    const fd = articleFormData()
    fd.set('image', imageFile())
    const created = (await createArticle(fd)) as { articleId: number }

    const result = await deleteArticle(created.articleId)

    expect(result.ok).toBe(true)
    await expect(
      payload.findByID({ collection: 'articles', id: created.articleId, overrideAccess: true }),
    ).rejects.toThrow()
  })
})

describe('bulkDeleteArticles', () => {
  it('deletes the selected articles together', async () => {
    const firstFd = articleFormData({ title: 'أول' })
    firstFd.set('image', imageFile())
    const first = (await createArticle(firstFd)) as { articleId: number }

    const secondFd = articleFormData({ title: 'ثان' })
    secondFd.set('image', imageFile())
    const second = (await createArticle(secondFd)) as { articleId: number }

    const result = await bulkDeleteArticles([first.articleId, second.articleId])

    expect(result).toEqual({ ok: true, count: 2 })
    await expect(
      payload.findByID({ collection: 'articles', id: first.articleId, overrideAccess: true }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'articles', id: second.articleId, overrideAccess: true }),
    ).rejects.toThrow()
  })

  it('does nothing for an empty selection', async () => {
    const result = await bulkDeleteArticles([])

    expect(result).toEqual({ ok: true, count: 0 })
  })
})

describe('permissions', () => {
  it('rejects article creation without a staff session', async () => {
    clearNextContext()
    setNextHeaders({})

    await expect(createArticle(articleFormData())).rejects.toThrow('Unauthorized')
  })

  it('rejects article creation for a regular member', async () => {
    const member = await createTestUser(payload, { role: 'user' })
    const { token } = await loginToken(payload, {
      email: member.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    await expect(createArticle(articleFormData())).rejects.toThrow('Unauthorized')
  })
})
