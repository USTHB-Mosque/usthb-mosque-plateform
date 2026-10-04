import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { createTestBook, createTestMedia } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { createBook, updateBook } from '@/features/admin/server/books'

import type { Payload } from 'payload'
import type { Book, User } from '@/payload-types'

let payload: Payload
let admin: User

function longDescriptionState(text: string) {
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

function richTextFrom(book: Book) {
  const nodes = (book.longDescription?.root as { children: unknown[] } | undefined)?.children ?? []
  const texts: string[] = []
  for (const node of nodes) {
    const children = (node as { children?: { text?: string }[] })?.children ?? []
    for (const child of children) {
      if (child.text) texts.push(child.text)
    }
  }
  return texts.join('\n')
}

function bookFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('title', 'الكتاب الجديد')
  fd.set('author', 'المؤلف')
  fd.append('type', 'aqidah')
  fd.set('category', 'religious')
  fd.set('shortDescription', 'وصف مختصر')
  fd.set('longDescription', JSON.stringify(longDescriptionState('وصف تفصيلي')))
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value)
  return fd
}

// Real PNG bytes so Payload's upload validation accepts the file.
function coverFile() {
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return new File([Buffer.from(base64, 'base64')], 'cover.png', { type: 'image/png' })
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await createTestUser(payload, { role: 'admin', email: 'admin@books-int.usthb.dz' })

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

async function bookById(bookId: number, depth = 0): Promise<Book> {
  return payload.findByID({ collection: 'books', id: bookId, overrideAccess: true, depth })
}

describe('createBook', () => {
  it('creates a book with all basic fields', async () => {
    const fd = bookFormData()

    const result = await createBook(fd)

    expect(result.ok).toBe(true)
    const bookId = (result as { bookId: number }).bookId
    const book = await bookById(bookId)
    expect(book.title).toBe('الكتاب الجديد')
    expect(book.author).toBe('المؤلف')
    expect(book.type).toEqual(['aqidah'])
    expect(book.category).toBe('religious')
    expect(book.availableBooks).toBe(0)
  })

  it('stores the long description as lexical rich text', async () => {
    const fd = bookFormData({
      longDescription: JSON.stringify(longDescriptionState('الوحي والقرآن والسنة')),
    })

    const result = await createBook(fd)

    const bookId = (result as { bookId: number }).bookId
    const book = await bookById(bookId)
    expect(richTextFrom(book)).toBe('الوحي والقرآن والسنة')
  })

  it('uploads the cover image when a file is provided', async () => {
    const fd = bookFormData()
    fd.set('image', coverFile())

    const result = await createBook(fd)

    const bookId = (result as { bookId: number }).bookId
    const book = await bookById(bookId, 1)
    expect((book.image as { id: number } | undefined)?.id).toBeTruthy()
  })
})

describe('updateBook', () => {
  it('replaces the cover image when a new file is uploaded', async () => {
    const fd = bookFormData()
    fd.set('image', coverFile())
    const created = (await createBook(fd)) as { bookId: number }

    const bookBefore = await bookById(created.bookId, 1)
    const oldImageId = (bookBefore.image as { id: number }).id

    const updateFd = bookFormData()
    updateFd.set('image', coverFile())
    const result = await updateBook(created.bookId, updateFd)

    expect(result.ok).toBe(true)
    const bookAfter = await bookById(created.bookId, 1)
    expect((bookAfter.image as { id: number }).id).not.toBe(oldImageId)

    // The old media doc still exists in storage.
    const oldMedia = await payload.findByID({
      collection: 'media',
      id: oldImageId,
      overrideAccess: true,
    })
    expect(oldMedia.id).toBe(oldImageId)
  })

  it('clears the cover image when clearImage is set', async () => {
    const fd = bookFormData()
    fd.set('image', coverFile())
    const created = (await createBook(fd)) as { bookId: number }

    const updateFd = bookFormData({ clearImage: 'true' })
    const result = await updateBook(created.bookId, updateFd)

    expect(result.ok).toBe(true)
    const book = await bookById(created.bookId, 1)
    expect(book.image).toBeFalsy()
  })

  it('keeps the cover when no new file and no clear flag are sent', async () => {
    const fd = bookFormData()
    fd.set('image', coverFile())
    const created = (await createBook(fd)) as { bookId: number }
    const bookBefore = await bookById(created.bookId, 1)
    const oldImageId = (bookBefore.image as { id: number }).id

    const updateFd = bookFormData({ title: 'عنوان معدل' })
    const result = await updateBook(created.bookId, updateFd)

    expect(result.ok).toBe(true)
    const book = await bookById(created.bookId, 1)
    expect(book.title).toBe('عنوان معدل')
    expect((book.image as { id: number }).id).toBe(oldImageId)
  })

  it('updates the long description on edit', async () => {
    const fd = bookFormData({
      longDescription: JSON.stringify(longDescriptionState('النسخة الأولى')),
    })
    const created = (await createBook(fd)) as { bookId: number }

    const updateFd = bookFormData({
      longDescription: JSON.stringify(longDescriptionState('النسخة الثانية بعد التعديل')),
    })
    const result = await updateBook(created.bookId, updateFd)

    expect(result.ok).toBe(true)
    const book = await bookById(created.bookId)
    expect(richTextFrom(book)).toBe('النسخة الثانية بعد التعديل')
  })
})

describe('permissions', () => {
  it('rejects book creation without an admin session', async () => {
    clearNextContext()
    setNextHeaders({})

    await expect(createBook(bookFormData())).rejects.toThrow('Unauthorized')
  })
})
