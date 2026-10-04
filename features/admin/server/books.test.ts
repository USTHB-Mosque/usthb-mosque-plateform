import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStaffCtx = vi.fn()
const revalidatePath = vi.fn()
const writeLog = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({ getStaffCtx: (...args: unknown[]) => getStaffCtx(...args) }))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))

const { createBook, updateBook, getAdminBook, softDeleteBook, bulkSoftDeleteBooks, deleteBook } =
  await import('./books')
const user = { id: 2, role: 'admin' }

function context(payload: Record<string, ReturnType<typeof vi.fn>> = {}) {
  getStaffCtx.mockResolvedValue({ payload, user })
}

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('title', 'الكتاب')
  fd.set('author', 'المؤلف')
  fd.set('type', 'fiqh')
  fd.set('category', 'religious')
  fd.set('shortDescription', 'وصف')
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value)
  return fd
}

function png() {
  return new File([new Uint8Array([1, 2, 3])], 'cover.png', { type: 'image/png' })
}

describe('features/admin/server/books.ts', () => {
  beforeEach(() => {
    getStaffCtx.mockReset()
    revalidatePath.mockReset()
    writeLog.mockReset()
  })

  it('creates a book without optional data and uses defaults', async () => {
    const create = vi.fn().mockResolvedValue({ id: 12 })
    context({ create })
    await expect(createBook(form())).resolves.toEqual({ ok: true, bookId: 12 })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'books',
        data: expect.objectContaining({
          type: ['fiqh'],
          category: 'religious',
          longDescription: undefined,
          totalBooks: 0,
          availableBooks: 0,
        }),
        overrideAccess: false,
      }),
    )
    expect(writeLog).toHaveBeenCalled()
  })

  it('parses optional fields and uploads a cover image', async () => {
    const create = vi.fn().mockResolvedValueOnce({ id: 90 }).mockResolvedValueOnce({ id: 13 })
    context({ create })
    const fd = form({
      type: 'hadith',
      category: '',
      longDescription: JSON.stringify({ root: {} }),
      publisher: 'ناشر',
      language: 'ar',
      pageCount: '50',
      isbn: '123',
      editionNumber: '2',
      publishDate: '2025-01-01',
      totalBooks: '4',
      availableBooks: '3',
      location: 'A1',
    })
    fd.append('type', 'tafsir')
    fd.set('image', png())
    await createBook(fd)
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'media',
        file: expect.objectContaining({ mimetype: 'image/png', name: 'cover.png', size: 3 }),
        req: { user },
        overrideAccess: false,
      }),
    )
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          type: ['hadith', 'tafsir'],
          category: 'religious',
          longDescription: { root: {} },
          publisher: 'ناشر',
          pageCount: 50,
          totalBooks: 4,
          availableBooks: 3,
          image: 90,
        }),
      }),
    )
  })

  it('updates a book, clears its cover, and revalidates both pages', async () => {
    const update = vi.fn().mockResolvedValue({ id: 3 })
    context({ update })
    const fd = form({ clearImage: 'true' })
    await expect(updateBook(3, fd)).resolves.toEqual({ ok: true, bookId: 3 })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'books',
        id: 3,
        data: expect.objectContaining({ image: null }),
        overrideAccess: false,
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/library')
    expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/library/book/3')
  })

  it('updates a book with a replacement image', async () => {
    const create = vi.fn().mockResolvedValueOnce({ id: 91 })
    const update = vi.fn().mockResolvedValue({ id: 4 })
    context({ create, update })
    const fd = form({
      publisher: '',
      language: '',
      pageCount: '',
      totalBooks: '',
      availableBooks: '',
    })
    fd.set('image', png())
    await updateBook(4, fd)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          image: 91,
          publisher: undefined,
          pageCount: undefined,
          totalBooks: 0,
          availableBooks: 0,
        }),
      }),
    )
  })

  it('retrieves a book with depth two', async () => {
    const doc = { id: 3 }
    const findByID = vi.fn().mockResolvedValue(doc)
    context({ findByID })
    await expect(getAdminBook('3')).resolves.toBe(doc)
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'books',
        id: '3',
        depth: 2,
        overrideAccess: false,
        user,
      }),
    )
  })

  it('soft deletes a book and logs it', async () => {
    const findByID = vi.fn().mockResolvedValue({ id: 3, title: 'عنوان' })
    const update = vi.fn().mockResolvedValue({})
    context({ findByID, update })
    await expect(softDeleteBook(3)).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deletedAt: expect.any(String) },
        overrideAccess: false,
        user,
      }),
    )
    expect(writeLog).toHaveBeenCalled()
  })

  it('returns success for an empty bulk archive without loading context', async () => {
    await expect(bulkSoftDeleteBooks([])).resolves.toEqual({ ok: true, count: 0 })
    expect(getStaffCtx).not.toHaveBeenCalled()
  })

  it('bulk archives books and reports partial failures', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ docs: [{ id: 1 }], errors: [new Error('one failed')] })
    context({ update })
    await expect(bulkSoftDeleteBooks([1, 2])).resolves.toEqual({ ok: false, count: 1 })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [1, 2] } }, overrideAccess: false, user }),
    )
    expect(writeLog).toHaveBeenCalled()
  })

  it('returns success when all books are bulk archived', async () => {
    context({ update: vi.fn().mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }], errors: [] }) })
    await expect(bulkSoftDeleteBooks([1, 2])).resolves.toEqual({ ok: true, count: 2 })
  })

  it('handles missing records and protected records on permanent delete', async () => {
    context({ findByID: vi.fn().mockRejectedValue(new Error('missing')) })
    await expect(deleteBook(1)).resolves.toEqual({ ok: false, error: 'الكتاب غير موجود' })

    context({
      findByID: vi.fn().mockResolvedValue({ title: 'مرتبط' }),
      delete: vi.fn().mockRejectedValue(new Error('foreign key')),
    })
    await expect(deleteBook(2)).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('الأرشفة'),
    })
  })

  it('permanently deletes an unreferenced book', async () => {
    context({
      findByID: vi.fn().mockResolvedValue({ title: 'قديم' }),
      delete: vi.fn().mockResolvedValue({}),
    })
    await expect(deleteBook(3)).resolves.toEqual({ ok: true })
    expect(writeLog).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin-panel/library')
  })
})
