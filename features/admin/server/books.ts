'use server'

import { revalidatePath } from 'next/cache'
import { getStaffCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import type { Payload } from 'payload'
import type { Book, User } from '@/payload-types'

async function getBookCtx() {
  return getStaffCtx()
}

type BookFormData = {
  title: string
  author: string
  type: Book['type']
  category: NonNullable<Book['category']>
  shortDescription: string
  longDescription?: NonNullable<Book['longDescription']>
  publisher?: string
  language?: Book['language']
  pageCount?: number
  isbn?: string
  editionNumber?: string
  publishDate?: string
  totalBooks?: number
  availableBooks?: number
  location?: string
  image?: number
}

function parseBookFields(formData: FormData): BookFormData {
  const title = formData.get('title') as string
  const author = formData.get('author') as string
  const types = formData
    .getAll('type')
    .filter((v): v is string => typeof v === 'string' && v !== '')
  const category = formData.get('category') as string
  const shortDescription = formData.get('shortDescription') as string
  const publisher = formData.get('publisher') as string | null
  const language = formData.get('language') as string | null
  const pageCount = formData.get('pageCount') as string | null
  const isbn = formData.get('isbn') as string | null
  const editionNumber = formData.get('editionNumber') as string | null
  const publishDate = formData.get('publishDate') as string | null
  const totalBooks = formData.get('totalBooks') as string | null
  const availableBooks = formData.get('availableBooks') as string | null
  const location = formData.get('location') as string | null
  const longDescriptionRaw = formData.get('longDescription') as string | null

  return {
    title,
    author,
    type: types as Book['type'],
    category: (category || 'religious') as NonNullable<Book['category']>,
    shortDescription,
    longDescription: longDescriptionRaw
      ? (JSON.parse(longDescriptionRaw) as NonNullable<Book['longDescription']>)
      : undefined,
    publisher: publisher || undefined,
    language: (language || undefined) as Book['language'],
    pageCount: pageCount ? Number(pageCount) : undefined,
    isbn: isbn || undefined,
    editionNumber: editionNumber || undefined,
    publishDate: publishDate || undefined,
    totalBooks: totalBooks ? Number(totalBooks) : 0,
    availableBooks: availableBooks ? Number(availableBooks) : 0,
    location: location || undefined,
  }
}

async function uploadCoverImage(
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

export async function createBook(formData: FormData) {
  const { payload, user } = await getBookCtx()

  const fields = parseBookFields(formData)
  const imageId = await uploadCoverImage(payload, formData.get('image'), user, fields.title)

  const book = await payload.create({
    collection: 'books',
    data: {
      ...fields,
      image: imageId || undefined,
    },
    req: { user },
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/library')
  await writeLog(payload, user, {
    action: LogAction.BookCreated,
    targetType: 'book',
    targetId: book.id,
    message: `أضاف كتاباً: ${fields.title}`,
  })
  return { ok: true, bookId: book.id }
}

export async function updateBook(bookId: number, formData: FormData) {
  const { payload, user } = await getBookCtx()

  const fields = parseBookFields(formData)
  const imageId = await uploadCoverImage(payload, formData.get('image'), user, fields.title)
  const clearImage = formData.get('clearImage') === 'true'

  const book = await payload.update({
    collection: 'books',
    id: bookId,
    data: {
      ...fields,
      image: clearImage ? null : imageId || undefined,
    },
    req: { user },
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/library')
  revalidatePath(`/admin-panel/library/book/${bookId}`)
  await writeLog(payload, user, {
    action: LogAction.BookUpdated,
    targetType: 'book',
    targetId: bookId,
    message: `عدّل كتاباً: ${fields.title}`,
  })
  return { ok: true, bookId: book.id }
}

export async function getAdminBook(bookId: number | string) {
  const { payload, user } = await getBookCtx()

  const doc = await payload.findByID({
    collection: 'books',
    id: bookId as number,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return doc
}

export async function softDeleteBook(bookId: number) {
  const { payload, user } = await getBookCtx()

  const book = await payload.findByID({
    collection: 'books',
    id: bookId,
    depth: 0,
    overrideAccess: false,
    user,
  })

  await payload.update({
    collection: 'books',
    id: bookId,
    data: { deletedAt: new Date().toISOString() },
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin-panel/library')
  await writeLog(payload, user, {
    action: LogAction.BookDeleted,
    targetType: 'book',
    targetId: bookId,
    message: `أرشف كتاباً: ${book.title}`,
  })
  return { ok: true }
}

export async function bulkSoftDeleteBooks(bookIds: number[]) {
  if (bookIds.length === 0) return { ok: true as const, count: 0 }

  const { payload, user } = await getBookCtx()

  const result = await payload.update({
    collection: 'books',
    where: { id: { in: bookIds } },
    data: { deletedAt: new Date().toISOString() },
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin-panel/library')
  await writeLog(payload, user, {
    action: LogAction.BookDeleted,
    targetType: 'book',
    message: `أرشف ${result.docs.length} كتاباً`,
  })
  return { ok: result.errors.length === 0, count: result.docs.length }
}

export async function deleteBook(bookId: number) {
  const { payload, user } = await getBookCtx()

  let book
  try {
    book = await payload.findByID({
      collection: 'books',
      id: bookId,
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false as const, error: 'الكتاب غير موجود' }
  }

  try {
    await payload.delete({
      collection: 'books',
      id: bookId,
      overrideAccess: false,
      user,
    })
  } catch {
    return {
      ok: false as const,
      error:
        'لا يمكن حذف هذا الكتاب نهائياً لوجود إعارات أو تقييمات مرتبطة به. استخدم الأرشفة بدلاً من ذلك.',
    }
  }

  revalidatePath('/admin-panel/library')
  await writeLog(payload, user, {
    action: LogAction.BookDeleted,
    targetType: 'book',
    targetId: bookId,
    message: `حذف نهائياً كتاب: ${book.title}`,
  })
  return { ok: true as const }
}
