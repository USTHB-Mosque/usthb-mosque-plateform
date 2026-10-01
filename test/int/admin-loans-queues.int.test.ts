import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  approveExtension,
  getAdminExtensions,
  refuseExtension,
} from '@/features/admin/server/extensions'
import {
  assignWaitlistEntry,
  getWaitlist,
  moveWaitlistEntryToFront,
} from '@/features/admin/server/waitlist'
import { resolveRelationId } from '@/shared/lib/relations'

import type { Payload } from 'payload'
import type { Book, Loan, LoanExtension, User, WaitlistEntry } from '@/payload-types'

let payload: Payload
let admin: User
let member: User
let otherMember: User
let thirdMember: User

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function loginAs(user: User) {
  const { token } = await loginToken(payload, {
    email: user.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await createTestUser(payload, { role: 'admin', email: 'admin@loan-queues.usthb.dz' })
  member = await createTestUser(payload, {
    verified: true,
    email: 'borrower@loan-queues.usthb.dz',
  })
  otherMember = await createTestUser(payload, {
    verified: true,
    email: 'second@loan-queues.usthb.dz',
  })
  thirdMember = await createTestUser(payload, {
    verified: true,
    email: 'third@loan-queues.usthb.dz',
  })
  await loginAs(admin)

  vi.spyOn(payload, 'sendEmail')
    .mockImplementation(async () => undefined)
    .mockClear()
})

afterAll(async () => {
  await payload.db.destroy?.()
})

/** A loan the member has actually collected, which is what an extension needs. */
async function pickedUpLoan(days: number): Promise<Loan> {
  const book = await createTestBook(payload, { available: 0, total: 1 })
  return createTestLoan(payload, {
    book: book.id,
    user: member.id,
    status: 'picked_up',
    pickupCode: `مك-01/${book.id}/26`,
    dueDate: new Date(Date.now() + days * 86_400_000).toISOString(),
  })
}

/** Leaves a `pending` request — the collection hook stamps both due dates. */
async function requestExtension(days = 3): Promise<LoanExtension> {
  const loan = await pickedUpLoan(7)
  return (await payload.create({
    collection: 'loan-extensions',
    data: { loan: loan.id, user: member.id, days },
    overrideAccess: true,
  })) as LoanExtension
}

async function extensionAfter(extensionId: number): Promise<LoanExtension> {
  return payload.findByID({
    collection: 'loan-extensions',
    id: extensionId,
    overrideAccess: true,
    depth: 0,
  })
}

async function loanAfter(loanId: number): Promise<Loan> {
  return payload.findByID({ collection: 'loans', id: loanId, overrideAccess: true, depth: 0 })
}

function loanIdOf(extension: LoanExtension): number {
  return resolveRelationId(extension.loan)
}

/** Both dates come back from the driver in whatever precision it stores. */
function iso(value?: string | null): string {
  return new Date(value ?? '').toISOString()
}

async function decisionLogs(action: string) {
  const { docs } = await payload.find({
    collection: 'logs',
    where: { action: { equals: action } },
    overrideAccess: true,
  })
  return docs
}

/** Joins a book's FIFO queue; `position` is stamped by the collection hook. */
async function enqueue(bookId: number, user: User): Promise<WaitlistEntry> {
  return (await payload.create({
    collection: 'waitlist-entries',
    data: { book: bookId, user: user.id, position: 0 },
    overrideAccess: true,
  })) as WaitlistEntry
}

/** A book's queue as stored, in position order, with relations unresolved. */
async function queueOf(bookId: number): Promise<WaitlistEntry[]> {
  const { docs } = await payload.find({
    collection: 'waitlist-entries',
    where: { book: { equals: bookId } },
    sort: 'position',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return docs as WaitlistEntry[]
}

async function bookAfter(bookId: number): Promise<Book> {
  return payload.findByID({ collection: 'books', id: bookId, overrideAccess: true, depth: 0 })
}

async function countLoans(): Promise<number> {
  const { totalDocs } = await payload.count({ collection: 'loans', overrideAccess: true })
  return totalDocs
}

/** A book with `copies` free and three people waiting, in join order. */
async function threePersonQueue(copies: number): Promise<{ book: Book; entries: WaitlistEntry[] }> {
  const book = await createTestBook(payload, { available: copies, total: 3 })
  const entries: WaitlistEntry[] = []
  for (const user of [member, otherMember, thirdMember]) {
    entries.push(await enqueue(book.id, user))
  }
  return { book, entries }
}

describe('getAdminExtensions', () => {
  it('defaults to the pending queue, newest first, and paginates', async () => {
    const older = await requestExtension()
    await sleep(8)
    const newer = await requestExtension()

    const firstPage = await getAdminExtensions({ limit: 1 })
    expect(firstPage.page).toBe(1)
    expect(firstPage.totalDocs).toBe(2)
    expect(firstPage.totalPages).toBe(2)
    expect(firstPage.docs).toHaveLength(1)

    const secondPage = await getAdminExtensions({ limit: 1, page: 2 })
    expect(firstPage.docs[0].id).toBe(newer.id)
    expect(secondPage.docs[0].id).toBe(older.id)
    expect(firstPage.docs.every((doc) => doc.status === 'pending')).toBe(true)
  })

  it('returns only extensions in the requested state', async () => {
    const pending = await requestExtension()
    const approved = await requestExtension()
    const refused = await requestExtension()
    const withdrawn = await requestExtension()

    await payload.update({
      collection: 'loan-extensions',
      id: approved.id,
      data: { status: 'approved', adminResponse: 'تمت الموافقة' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'loan-extensions',
      id: refused.id,
      data: { status: 'refused', adminResponse: 'النفاذ' },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'loan-extensions',
      id: withdrawn.id,
      data: { status: 'withdrawn' },
      overrideAccess: true,
    })

    const ids = (docs: LoanExtension[]) => docs.map((doc) => doc.id)

    expect(ids((await getAdminExtensions()).docs)).toEqual([pending.id])
    expect(ids((await getAdminExtensions({ status: 'approved' })).docs)).toEqual([approved.id])
    expect(ids((await getAdminExtensions({ status: 'refused' })).docs)).toEqual([refused.id])
    expect(ids((await getAdminExtensions({ status: 'withdrawn' })).docs)).toEqual([withdrawn.id])
  })

  it('refuses an anonymous caller', async () => {
    clearNextContext()

    await expect(getAdminExtensions()).rejects.toThrow('Unauthorized')
  })

  it('refuses a non-admin member', async () => {
    await loginAs(member)

    await expect(getAdminExtensions()).rejects.toThrow('Unauthorized')
  })
})

describe('approveExtension / refuseExtension', () => {
  it('approves a request, moves the due date and audits the decision against the loan', async () => {
    const extension = await requestExtension(5)
    const loanId = loanIdOf(extension)
    const targetDueDate = extension.newDueDate

    expect(await approveExtension(extension.id)).toEqual({ ok: true })

    expect((await extensionAfter(extension.id)).status).toBe('approved')
    expect(iso((await loanAfter(loanId)).dueDate)).toBe(iso(targetDueDate))

    const logs = await decisionLogs('extension_approved')
    expect(logs).toHaveLength(1)
    expect(logs[0].targetType).toBe('loan')
    expect(logs[0].targetId).toBe(String(loanId))
    expect(logs[0].message).toBe('قبل تمديد ميعاد الإرجاع: Test Book')
  })

  it('records the admin reason when refusing, and logs it against the loan', async () => {
    const extension = await requestExtension()
    const loanId = loanIdOf(extension)

    expect(await refuseExtension(extension.id, 'الأولوية لطلب آخر')).toEqual({ ok: true })

    const after = await extensionAfter(extension.id)
    expect(after.status).toBe('refused')
    expect(after.adminResponse).toBe('الأولوية لطلب آخر')
    // Refusing must not move the member's deadline.
    expect(iso((await loanAfter(loanId)).dueDate)).toBe(iso(extension.originalDueDate))

    const logs = await decisionLogs('extension_refused')
    expect(logs).toHaveLength(1)
    expect(logs[0].targetType).toBe('loan')
    expect(logs[0].targetId).toBe(String(loanId))
    expect(logs[0].message).toBe('رفض تمديد ميعاد الإرجاع: Test Book')
  })

  it('reports an error for an extension that does not exist', async () => {
    expect(await approveExtension(999_999)).toEqual({
      ok: false,
      error: 'طلب التمديد غير موجود',
    })
    expect(await decisionLogs('extension_approved')).toHaveLength(0)
  })

  it('does not decide the same extension twice', async () => {
    const extension = await requestExtension()

    expect(await approveExtension(extension.id)).toEqual({ ok: true })
    expect(await approveExtension(extension.id)).toEqual({
      ok: false,
      error: 'تمت معالجة طلب التمديد مسبقاً',
    })
    expect(await decisionLogs('extension_approved')).toHaveLength(1)
  })

  it('refuses a non-admin member before touching the request', async () => {
    await loginAs(member)

    await expect(approveExtension(1)).rejects.toThrow('Unauthorized')
    await expect(refuseExtension(1, 'سبب')).rejects.toThrow('Unauthorized')
  })
})

describe('getWaitlist', () => {
  it('returns one queue per book, in position order, with the free-copy count', async () => {
    const first = await createTestBook(payload, { title: 'كتاب أول', available: 0, total: 2 })
    const second = await createTestBook(payload, { title: 'كتاب ثانٍ', available: 1, total: 2 })

    await enqueue(first.id, member)
    await enqueue(first.id, otherMember)
    await enqueue(first.id, thirdMember)
    await enqueue(second.id, thirdMember)

    const page = await getWaitlist()

    expect(page.page).toBe(1)
    expect(page.totalPages).toBe(1)
    expect(page.totalDocs).toBe(2)
    expect(page.docs.map((queue) => queue.bookId)).toEqual([first.id, second.id])

    const queue = page.docs[0]
    expect(queue.title).toBe('كتاب أول')
    expect(queue.availableBooks).toBe(0)
    expect(queue.entries.map((entry) => entry.position)).toEqual([1, 2, 3])
    expect(queue.entries.map((entry) => resolveRelationId(entry.user))).toEqual([
      member.id,
      otherMember.id,
      thirdMember.id,
    ])
    expect(page.docs[1].availableBooks).toBe(1)
    expect(page.docs[1].entries).toHaveLength(1)
  })

  it('finds a queue by book title', async () => {
    const target = await createTestBook(payload, { title: 'تفسير السعدي' })
    const other = await createTestBook(payload, { title: 'العقيدة الواسعة' })
    await enqueue(target.id, member)
    await enqueue(other.id, otherMember)

    const page = await getWaitlist({ search: 'سعدي' })

    expect(page.totalDocs).toBe(1)
    expect(page.docs[0].bookId).toBe(target.id)
  })

  it('finds a queue by borrower', async () => {
    const mine = await createTestBook(payload, { title: 'كتاب المستعير' })
    const theirs = await createTestBook(payload, { title: 'كتاب زميلي' })
    await enqueue(mine.id, member)
    await enqueue(theirs.id, otherMember)

    const page = await getWaitlist({ search: 'borrower@loan-queues' })

    expect(page.totalDocs).toBe(1)
    expect(page.docs[0].bookId).toBe(mine.id)
  })

  it('returns an empty page when nothing matches', async () => {
    const book = await createTestBook(payload)
    await enqueue(book.id, member)

    const page = await getWaitlist({ search: 'لا شيء بهذا الاسم' })

    expect(page.docs).toEqual([])
    expect(page.totalDocs).toBe(0)
    expect(page.totalPages).toBe(1)
    expect(page.page).toBe(1)
  })

  it('pages by book, never splitting a queue across pages', async () => {
    const books: Book[] = []
    for (let index = 0; index < 3; index += 1) {
      const book = await createTestBook(payload, { title: `كتاب ${index}` })
      await enqueue(book.id, member)
      await enqueue(book.id, otherMember)
      books.push(book)
    }

    const firstPage = await getWaitlist({ limit: 2 })
    expect(firstPage.page).toBe(1)
    expect(firstPage.totalDocs).toBe(3)
    expect(firstPage.totalPages).toBe(2)
    expect(firstPage.docs).toHaveLength(2)

    const secondPage = await getWaitlist({ limit: 2, page: 2 })
    expect(secondPage.docs).toHaveLength(1)
    expect(secondPage.docs[0].bookId).toBe(books[2].id)
    expect(secondPage.docs[0].entries).toHaveLength(2)
  })

  it('refuses a non-admin member', async () => {
    await loginAs(member)

    await expect(getWaitlist()).rejects.toThrow('Unauthorized')
  })
})

describe('assignWaitlistEntry', () => {
  it('hands the head of the queue the free copy and renumbers the rest', async () => {
    const { book, entries } = await threePersonQueue(1)

    const result = await assignWaitlistEntry(entries[0].id)

    expect(result.ok).toBe(true)
    const loan = await loanAfter(result.loanId as number)
    expect(loan.status).toBe('accepted')
    expect(resolveRelationId(loan.book)).toBe(book.id)
    expect(resolveRelationId(loan.user)).toBe(member.id)
    expect((await bookAfter(book.id)).availableBooks).toBe(0)

    const remaining = await queueOf(book.id)
    expect(remaining.map((entry) => entry.position)).toEqual([1, 2])
    expect(remaining.map((entry) => resolveRelationId(entry.user))).toEqual([
      otherMember.id,
      thirdMember.id,
    ])

    const logs = await decisionLogs('loan_approved')
    expect(logs).toHaveLength(1)
    expect(logs[0].targetType).toBe('loan')
    expect(logs[0].targetId).toBe(String(result.loanId))
    expect(logs[0].message).toBe('قبل طلب إعارة للكتاب: Test Book')
  })

  it('assigns the tail without rewriting rows that are already in place', async () => {
    const { book, entries } = await threePersonQueue(1)

    const result = await assignWaitlistEntry(entries[2].id)

    expect(result.ok).toBe(true)
    expect((await bookAfter(book.id)).availableBooks).toBe(0)

    const remaining = await queueOf(book.id)
    expect(remaining.map((entry) => entry.position)).toEqual([1, 2])
    expect(remaining.map((entry) => resolveRelationId(entry.user))).toEqual([
      member.id,
      otherMember.id,
    ])
  })

  it('refuses when the book has no copy to hand over', async () => {
    const book = await createTestBook(payload, { available: 0, total: 1 })
    const entry = await enqueue(book.id, member)

    expect(await assignWaitlistEntry(entry.id)).toEqual({
      ok: false,
      error: 'لا توجد نسخة متاحة لإسنادها',
    })
    expect(await queueOf(book.id)).toHaveLength(1)
    expect(await countLoans()).toBe(0)
  })

  it('treats an unset copy count as nothing to hand over', async () => {
    const book = await createTestBook(payload, { available: 1, total: 1 })
    await payload.update({
      collection: 'books',
      id: book.id,
      data: { availableBooks: null },
      overrideAccess: true,
    })
    const entry = await enqueue(book.id, member)

    expect(await assignWaitlistEntry(entry.id)).toEqual({
      ok: false,
      error: 'لا توجد نسخة متاحة لإسنادها',
    })
  })

  it('reports an entry that does not exist', async () => {
    expect(await assignWaitlistEntry(999_999)).toEqual({
      ok: false,
      error: 'سجل قائمة الانتظار غير موجود',
    })
  })

  it('refuses a non-admin member', async () => {
    await loginAs(member)

    await expect(assignWaitlistEntry(1)).rejects.toThrow('Unauthorized')
  })

  it('changes nothing when the transaction cannot open', async () => {
    const { book, entries } = await threePersonQueue(1)
    const begin = vi.spyOn(payload.db, 'beginTransaction').mockResolvedValueOnce(null)

    try {
      expect(await assignWaitlistEntry(entries[0].id)).toEqual({
        ok: false,
        error: 'حدث خطأ أثناء إسناد النسخة',
      })
    } finally {
      begin.mockRestore()
    }

    expect(await queueOf(book.id)).toHaveLength(3)
    expect((await bookAfter(book.id)).availableBooks).toBe(1)
    expect(await countLoans()).toBe(0)
  })

  it('rolls the whole assignment back when the loan cannot be accepted', async () => {
    const { book, entries } = await threePersonQueue(1)
    await payload.db.pool.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "reject_assign_for_test" CHECK (status <> 'accepted')`,
    )

    try {
      expect(await assignWaitlistEntry(entries[0].id)).toEqual({
        ok: false,
        error: 'حدث خطأ أثناء تحديث حالة الإعارة',
      })
      expect(await countLoans()).toBe(0)
      expect(await queueOf(book.id)).toHaveLength(3)
      expect((await bookAfter(book.id)).availableBooks).toBe(1)
    } finally {
      await payload.db.pool.query(
        `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "reject_assign_for_test"`,
      )
    }
  })

  it('rolls back a dequeue that cannot be written', async () => {
    const { book, entries } = await threePersonQueue(1)
    const remove = vi.spyOn(payload, 'delete').mockImplementationOnce(() => {
      throw new Error('dequeue exploded')
    })

    try {
      expect(await assignWaitlistEntry(entries[0].id)).toEqual({
        ok: false,
        error: 'حدث خطأ أثناء إسناد النسخة',
      })
    } finally {
      remove.mockRestore()
    }

    expect(await countLoans()).toBe(0)
    expect(await queueOf(book.id)).toHaveLength(3)
    expect((await bookAfter(book.id)).availableBooks).toBe(1)
    expect(await decisionLogs('loan_approved')).toHaveLength(0)
  })
})

describe('moveWaitlistEntryToFront', () => {
  it('puts a row at the head and shifts everyone else down', async () => {
    const { book, entries } = await threePersonQueue(0)

    expect(await moveWaitlistEntryToFront(entries[1].id)).toEqual({ ok: true })

    const after = await queueOf(book.id)
    expect(after.map((entry) => entry.position)).toEqual([1, 2, 3])
    expect(after.map((entry) => resolveRelationId(entry.user))).toEqual([
      otherMember.id,
      member.id,
      thirdMember.id,
    ])
  })

  it('leaves a row that is already first where it is', async () => {
    const { book, entries } = await threePersonQueue(0)

    expect(await moveWaitlistEntryToFront(entries[0].id)).toEqual({ ok: true })

    const after = await queueOf(book.id)
    expect(after.map((entry) => entry.position)).toEqual([1, 2, 3])
    expect(after.map((entry) => resolveRelationId(entry.user))).toEqual([
      member.id,
      otherMember.id,
      thirdMember.id,
    ])
  })

  it('reports an entry that does not exist', async () => {
    expect(await moveWaitlistEntryToFront(999_999)).toEqual({
      ok: false,
      error: 'سجل قائمة الانتظار غير موجود',
    })
  })

  it('refuses a non-admin member', async () => {
    await loginAs(member)

    await expect(moveWaitlistEntryToFront(1)).rejects.toThrow('Unauthorized')
  })

  it('changes nothing when the transaction cannot open', async () => {
    const { book, entries } = await threePersonQueue(0)
    const begin = vi.spyOn(payload.db, 'beginTransaction').mockResolvedValueOnce(null)

    try {
      expect(await moveWaitlistEntryToFront(entries[1].id)).toEqual({
        ok: false,
        error: 'حدث خطأ أثناء إسناد النسخة',
      })
    } finally {
      begin.mockRestore()
    }

    const after = await queueOf(book.id)
    expect(after.map((entry) => entry.position)).toEqual([1, 2, 3])
    expect(after.map((entry) => resolveRelationId(entry.user))).toEqual([
      member.id,
      otherMember.id,
      thirdMember.id,
    ])
  })

  it('rolls the reorder back when a write fails', async () => {
    const { book, entries } = await threePersonQueue(0)
    const update = vi.spyOn(payload, 'update').mockImplementationOnce(() => {
      throw new Error('reorder exploded')
    })

    try {
      expect(await moveWaitlistEntryToFront(entries[1].id)).toEqual({
        ok: false,
        error: 'حدث خطأ أثناء إسناد النسخة',
      })
    } finally {
      update.mockRestore()
    }

    const after = await queueOf(book.id)
    expect(after.map((entry) => entry.position)).toEqual([1, 2, 3])
    expect(after.map((entry) => resolveRelationId(entry.user))).toEqual([
      member.id,
      otherMember.id,
      thirdMember.id,
    ])
  })
})
