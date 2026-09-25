import { describe, expect, it, vi, beforeEach } from 'vitest'

const getStaffCtx = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('./ctx', () => ({
  getStaffCtx: (...args: unknown[]) => getStaffCtx(...args),
}))

const {
  getAdminArticlesStats,
  createArticle,
  updateArticle,
  getAdminArticle,
  deleteArticle,
  bulkDeleteArticles,
} = await import('./articles')

type PayloadStub = {
  create?: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
  findByID?: ReturnType<typeof vi.fn>
  delete?: ReturnType<typeof vi.fn>
  count?: ReturnType<typeof vi.fn>
}

function staffMock(
  payload: PayloadStub = {},
  user: { id: number; role: string } = { id: 1, role: 'admin' },
) {
  getStaffCtx.mockResolvedValue({ payload, user })
}

function articleFormData(overrides: Record<string, string | null> = {}) {
  const fd = new FormData()
  fd.set('title', 'عنوان المقال')
  fd.set('type', 'aqidah')
  fd.set('author', 'الكاتب')
  fd.set('description', 'وصف مختصر')
  fd.set('publishDate', '2026-01-15')
  fd.set('content', JSON.stringify({ root: { children: [] } }))
  fd.set('tags', JSON.stringify([{ name: 'الطهارة' }]))
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) fd.delete(key)
    else fd.set(key, value)
  }
  return fd
}

function pngFile(): File {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return new File([Buffer.from(base64, 'base64')], 'image.png', { type: 'image/png' })
}

beforeEach(() => {
  getStaffCtx.mockReset()
})

describe('features/admin/server/articles.ts', () => {
  describe('getAdminArticlesStats', () => {
    it('returns the aggregated counts', async () => {
      const count = vi
        .fn()
        .mockResolvedValueOnce({ totalDocs: 10 })
        .mockResolvedValueOnce({ totalDocs: 3 })
        .mockResolvedValueOnce({ totalDocs: 1 })
      staffMock({ count })

      const { stats } = await getAdminArticlesStats()

      expect(stats).toEqual({
        totalArticles: 10,
        thisMonthArticles: 3,
        lastSevenDaysArticles: 1,
      })
      expect(count).toHaveBeenCalledTimes(3)
    })
  })

  describe('createArticle', () => {
    it('uploads the image and creates the article', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 11 })
      staffMock({ create })
      const fd = articleFormData()
      fd.set('image', pngFile())

      const result = await createArticle(fd)

      expect(result).toEqual({ ok: true, articleId: 11 })
      expect(create).toHaveBeenCalledTimes(2)
      expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ collection: 'media' }))
      expect(create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          collection: 'articles',
          data: expect.objectContaining({
            title: 'عنوان المقال',
            type: 'aqidah',
            author: 'الكاتب',
            description: 'وصف مختصر',
            image: 99,
          }),
          overrideAccess: false,
        }),
      )
    })

    it('skips optional fields when they are absent', async () => {
      const create = vi.fn().mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce({ id: 12 })
      staffMock({ create })
      const fd = articleFormData({ publishDate: null, content: null, tags: null })
      fd.set('image', pngFile())

      const result = await createArticle(fd)

      expect(result).toEqual({ ok: true, articleId: 12 })
      const data = create.mock.calls[1][0].data
      expect(data.publishDate).toBeUndefined()
      expect(data.content).toBeUndefined()
      expect(data.tags).toBeUndefined()
    })

    it('throws when the article has no image', async () => {
      staffMock({})
      const fd = articleFormData()

      await expect(createArticle(fd)).rejects.toThrow('صورة المقال مطلوبة')
    })

    it('throws when the image entry is not a file', async () => {
      const create = vi.fn()
      staffMock({ create })
      const fd = articleFormData()
      fd.set('image', 'not-a-file')

      await expect(createArticle(fd)).rejects.toThrow('صورة المقال مطلوبة')

      expect(create).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'media' }))
    })

    it('throws when the image file is empty', async () => {
      const create = vi.fn()
      staffMock({ create })
      const fd = articleFormData()
      fd.set('image', new File([], 'empty.png', { type: 'image/png' }))

      await expect(createArticle(fd)).rejects.toThrow('صورة المقال مطلوبة')

      expect(create).not.toHaveBeenCalledWith(expect.objectContaining({ collection: 'media' }))
    })
  })

  describe('updateArticle', () => {
    it('updates the article without touching the image', async () => {
      const update = vi.fn().mockResolvedValue({ id: 21 })
      staffMock({ update })
      const fd = articleFormData()

      const result = await updateArticle(21, fd)

      expect(result).toEqual({ ok: true, articleId: 21 })
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'articles',
          id: 21,
          data: expect.not.objectContaining({ image: expect.anything() }),
          overrideAccess: false,
        }),
      )
    })

    it('uploads and attaches a new image when provided', async () => {
      const create = vi.fn().mockResolvedValue({ id: 77 })
      const update = vi.fn().mockResolvedValue({ id: 21 })
      staffMock({ create, update })
      const fd = articleFormData()
      fd.set('image', pngFile())

      await updateArticle(21, fd)

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'media',
          file: expect.objectContaining({ name: 'image.png' }),
        }),
      )
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'articles',
          id: 21,
          data: expect.objectContaining({ image: 77 }),
        }),
      )
    })
  })

  describe('getAdminArticle', () => {
    it('returns the article found by id', async () => {
      const doc = { id: 5, title: 'مقال' }
      staffMock({ findByID: vi.fn().mockResolvedValue(doc) })

      const result = await getAdminArticle(5)

      expect(result).toBe(doc)
    })
  })

  describe('deleteArticle', () => {
    it('deletes the article', async () => {
      const deleteFn = vi.fn().mockResolvedValue({})
      staffMock({ delete: deleteFn })

      const result = await deleteArticle(5)

      expect(result).toEqual({ ok: true })
      expect(deleteFn).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'articles', id: 5, overrideAccess: false }),
      )
    })

    it('returns a friendly error when the delete fails', async () => {
      staffMock({ delete: vi.fn().mockRejectedValue(new Error('fk constraint')) })

      const result = await deleteArticle(5)

      expect(result).toEqual({ ok: false, error: expect.stringContaining('حذف') })
    })
  })

  describe('bulkDeleteArticles', () => {
    it('returns early for an empty selection', async () => {
      const deleteFn = vi.fn()
      staffMock({ delete: deleteFn })

      const result = await bulkDeleteArticles([])

      expect(result).toEqual({ ok: true, count: 0 })
      expect(deleteFn).not.toHaveBeenCalled()
    })

    it('deletes the selected articles and reports the count', async () => {
      const deleteFn = vi
        .fn()
        .mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }, { id: 3 }], errors: [] })
      staffMock({ delete: deleteFn })

      const result = await bulkDeleteArticles([1, 2, 3])

      expect(result).toEqual({ ok: true, count: 3 })
      expect(deleteFn).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'articles',
          where: { id: { in: [1, 2, 3] } },
          overrideAccess: false,
        }),
      )
    })

    it('returns ok false when some deletes fail', async () => {
      staffMock({ delete: vi.fn().mockResolvedValue({ docs: [{ id: 1 }], errors: [{ id: 2 }] }) })

      const result = await bulkDeleteArticles([1, 2])

      expect(result).toEqual({ ok: false, count: 1 })
    })
  })
})
