import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  commitBooksImport,
  commitUsersImport,
  previewBooksImport,
  previewUsersImport,
} from '@/features/admin/server/csv'

let payload: Payload
let admin: User
let librarian: User
let member: User

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const BOOK_HEADER = [
  'title',
  'author',
  'type',
  'category',
  'shortDescription',
  'longDescription',
  'publisher',
  'language',
  'pageCount',
  'isbn',
  'editionNumber',
  'publishDate',
  'totalBooks',
  'availableBooks',
  'location',
  'imageUrl',
]

const USER_HEADER = [
  'email',
  'password',
  'fullName',
  'phone',
  'faculty',
  'speciality',
  'studyYear',
  'situation',
  'role',
  'verificationStatus',
]

function csv(rows: string[][]): string {
  return rows
    .map((cells) => cells.map((cell) => (cell.includes(',') ? `"${cell}"` : cell)).join(','))
    .join('\n')
}

function bookCsv(...rows: string[][]): string {
  return csv([BOOK_HEADER, ...rows])
}

function userCsv(...rows: string[][]): string {
  return csv([USER_HEADER, ...rows])
}

function textFile(text: string, name: string): File {
  return new File([text], name, { type: 'text/csv' })
}

async function loginAs(user: User): Promise<void> {
  const { token } = await loginToken(payload, {
    email: user.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

async function bookCount(): Promise<number> {
  return (await payload.find({ collection: 'books', limit: 1, overrideAccess: true })).totalDocs
}

async function userCount(): Promise<number> {
  return (await payload.find({ collection: 'users', limit: 1, overrideAccess: true })).totalDocs
}

async function usersWithEmail(email: string) {
  return payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    depth: 0,
    overrideAccess: true,
  })
}

async function cardsFor(userId: number) {
  return payload.find({
    collection: 'library-cards',
    where: { user: { equals: userId } },
    depth: 0,
    overrideAccess: true,
  })
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await payload.create({
    collection: 'users',
    data: {
      email: 'admin@csv-int.usthb.dz',
      password: 'correct horse battery',
      fullName: 'CSV Admin',
      role: 'admin',
      verificationStatus: 'verified',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    },
    overrideAccess: true,
  })
  librarian = await payload.create({
    collection: 'users',
    data: {
      email: 'librarian@csv-int.usthb.dz',
      password: 'correct horse battery',
      fullName: 'CSV Librarian',
      role: 'librarian',
      verificationStatus: 'verified',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    },
    overrideAccess: true,
  })
  member = await payload.create({
    collection: 'users',
    data: {
      email: 'member@csv-int.usthb.dz',
      password: 'correct horse battery',
      fullName: 'CSV Member',
      role: 'user',
      verificationStatus: 'verified',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  await loginAs(admin)
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('books CSV import (#99)', () => {
  it('previews a valid file with row statistics', async () => {
    const file = textFile(
      bookCsv(
        ['أ', 'ب', 'عقيدة', '', 'وصف', '', '', '', '', '', '', '', '', '', '', ''],
        ['ج', 'د', 'فقه', '', 'وصف آخر', '', '', '', '', '', '', '', '', '', '', ''],
      ),
      'books.csv',
    )
    const preview = await previewBooksImport(file)
    expect(preview.total).toBe(2)
    expect(preview.validCount).toBe(2)
    expect(preview.invalidCount).toBe(0)
    expect(preview.preview).toHaveLength(2)
  })

  it('rejects non-staff callers', async () => {
    await loginAs(member)
    await expect(
      previewBooksImport(textFile(bookCsv(['أ', 'ب', 'عقيدة', '', 'وصف']), 'books.csv')),
    ).rejects.toThrow('Unauthorized')
  })

  it('lets a librarian preview but not commit book writes (admin-only)', async () => {
    await loginAs(librarian)

    const file = textFile(bookCsv(['أ', 'ب', 'عقيدة', '', 'وصف']), 'books.csv')
    const preview = await previewBooksImport(file)
    expect(preview.validCount).toBe(1)

    const outcome = await commitBooksImport(file)
    expect(outcome.ok).toBe(false)
    expect((outcome as { errors: { message: string }[] }).errors[0].message).toContain('صلاحية')
    expect(await bookCount()).toBe(0)
  })

  it('commits a file that downloads covers and creates media', async () => {
    const fetcher = vi.fn(
      async () => new Response(new Blob([PNG_BYTES], { type: 'image/png' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetcher)

    const file = textFile(
      bookCsv(
        [
          'الفوائد',
          'ابن قيم',
          'عقيدة',
          'religious',
          'وصف قصير',
          '',
          '',
          'ar',
          '300',
          '978-1',
          '',
          '2020-01-01',
          '4',
          '4',
          '',
          'https://x/cover.png',
        ],
        ['غير مصور', 'مؤلف', 'فقه', '', 'بدون غلاف'],
      ),
      'books.csv',
    )

    const outcome = await commitBooksImport(file)
    expect(outcome).toEqual({ ok: true, created: 2 })
    vi.unstubAllGlobals()

    const books = (await payload.find({ collection: 'books', limit: 10, overrideAccess: true }))
      .docs
    expect(books).toHaveLength(2)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const withImage = books.find((b) => b.isbn === '978-1')
    expect(withImage?.image).toBeTruthy()
  })

  it('imports nothing when a row is invalid', async () => {
    const file = textFile(
      bookCsv(['', 'ب', 'عقيدة', '', '', '', '', '', '', '', '', '', '', '', '', '']),
      'books.csv',
    )
    const outcome = await commitBooksImport(file)
    expect(outcome.ok).toBe(false)
    expect(await bookCount()).toBe(0)
  })

  it('rolls back the whole batch when one isbn already exists', async () => {
    await payload.create({
      collection: 'books',
      data: {
        title: 'Existing',
        author: 'X',
        type: ['aqidah'],
        category: 'religious',
        shortDescription: 'already in the DB',
        isbn: '999-0',
      },
      overrideAccess: true,
    })

    const file = textFile(
      bookCsv(
        ['جديد', 'ي', 'فقه', '', 'سطر سليم', '', '', '', '', '999-0'],
        ['ثانٍ', 'ز', 'عقيدة', '', 'سطر سليم أيضاً', '', '', '', '', '555-5'],
      ),
      'books.csv',
    )
    const outcome = await commitBooksImport(file)
    expect(outcome.ok).toBe(false)
    expect((outcome as { errors: { row: number; message: string }[] }).errors[0].message).toBe(
      'رقم ISBN مستخدم بالفعل',
    )
    expect(await bookCount()).toBe(1)
  })

  it('rejects an empty file', async () => {
    const outcome = await commitBooksImport(
      textFile('title,author,type,shortDescription', 'empty.csv'),
    )
    expect(outcome.ok).toBe(false)
    expect(outcome).toEqual({
      ok: false,
      errors: [{ row: 0, message: 'الملف لا يحتوي على أي صفوف' }],
    })
  })
})

describe('users CSV import (#99)', () => {
  it('previews a valid file', async () => {
    const file = textFile(
      userCsv(['a@x.dz', 'password1', 'محمد', '', '', '', '', '', '', 'verified']),
      'users.csv',
    )
    const preview = await previewUsersImport(file)
    expect(preview.total).toBe(1)
    expect(preview.validCount).toBe(1)
  })

  it('requires an admin caller', async () => {
    await loginAs(librarian)
    await expect(
      previewUsersImport(textFile(userCsv(['a@x.dz', 'password1']), 'users.csv')),
    ).rejects.toThrow('Unauthorized')

    await loginAs(member)
    await expect(
      previewUsersImport(textFile(userCsv(['a@x.dz', 'password1']), 'users.csv')),
    ).rejects.toThrow('Unauthorized')
  })

  it('creates users and mints library cards for verified imports', async () => {
    const file = textFile(
      userCsv([
        'verified1@csv.usthb.dz',
        'password1',
        'محمد',
        '055',
        'كلية',
        'تخصص',
        '3',
        'student',
        'member',
        'verified',
      ]),
      'users.csv',
    )
    const outcome = await commitUsersImport(file)
    expect(outcome).toEqual({ ok: true, created: 1 })

    const found = await usersWithEmail('verified1@csv.usthb.dz')
    expect(found.totalDocs).toBe(1)
    const created = (await payload.findByID({
      collection: 'users',
      id: found.docs[0].id,
      depth: 0,
      overrideAccess: true,
    })) as User
    expect(created.role).toBe('user')
    expect(created.verificationStatus).toBe('verified')
    expect(created.situation).toBe('student')

    const cards = await cardsFor(created.id)
    expect(cards.totalDocs).toBe(1)
    expect(cards.docs[0].cardId).toMatch(/^M-/)
    expect(created.cardId).toBe(cards.docs[0].cardId)
  })

  it('rejects rows with short passwords before writing anything', async () => {
    const file = textFile(userCsv(['a@x.dz', 'abc']), 'users.csv')
    const outcome = await commitUsersImport(file)
    expect(outcome.ok).toBe(false)
    expect(await userCount()).toBe(3)
  })

  it('rolls back the whole batch on a duplicate email', async () => {
    const before = await userCount()

    const file = textFile(
      userCsv(['new@csv.usthb.dz', 'password1', '', '', '', '', '', '', '', '']),
      'users.csv',
    )
    const first = await commitUsersImport(file)
    expect(first).toEqual({ ok: true, created: 1 })

    const dup = textFile(
      userCsv(['new@csv.usthb.dz', 'password2', 'مكرر', '', '', '', '', '', '', '']),
      'users.csv',
    )
    const outcome = await commitUsersImport(dup)
    expect(outcome.ok).toBe(false)
    expect((outcome as { errors: { row: number; message: string }[] }).errors[0].message).toBe(
      'البريد الإلكتروني مستخدم بالفعل',
    )
    expect(await userCount()).toBe(before + 1)
  })

  it('rolls back a batch where a later row fails a unique constraint', async () => {
    const file = textFile(
      userCsv(
        ['kept@csv.usthb.dz', 'password1', 'سليم', '', '', '', '', '', '', ''],
        ['member@csv-int.usthb.dz', 'password2', 'مكرر مع الموجود', '', '', '', '', '', '', ''],
      ),
      'users.csv',
    )
    const outcome = await commitUsersImport(file)
    expect(outcome.ok).toBe(false)
    expect(await usersWithEmail('kept@csv.usthb.dz').then((r) => r.totalDocs)).toBe(0)
    expect(await userCount()).toBe(3)
  })
})
