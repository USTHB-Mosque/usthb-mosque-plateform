import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestArticle, createTestBook, createTestLoan } from '../lib/factories'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { getAdminUserHistory } from '@/features/admin/server/users'
import { approveExtension } from '@/features/admin/server/extensions'

let payload: Payload
let admin: User
let member: User

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
  admin = await createTestUser(payload, {
    role: 'admin',
    email: 'admin@user-detail-int.usthb.dz',
    verified: true,
  })
  member = await createTestUser(payload, {
    email: 'member@user-detail-int.usthb.dz',
    verified: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('admin user detail history (#156)', () => {
  it('refuses non-admins', async () => {
    await loginAs(member)
    await expect(getAdminUserHistory(member.id)).rejects.toThrow('Unauthorized')
  })

  it('lists previous borrowings with their returned state', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload)
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'returned',
      loanDate: new Date().toISOString(),
      returnDate: new Date().toISOString(),
    })
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      loanDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    })

    const history = await getAdminUserHistory(member.id)

    expect(history.borrowings.total).toBe(2)
    expect(history.borrowings.docs).toHaveLength(2)
    const states = history.borrowings.docs.map((row) => [row.status, row.returned])
    expect(states).toEqual(
      expect.arrayContaining([
        ['picked_up', false],
        ['returned', true],
      ]),
    )
    expect(history.borrowings.docs[0].title).toBe(book.title)
  })

  it("lists the member's reviews and their extension requests with the due-check", async () => {
    await loginAs(admin)
    const book = await createTestBook(payload, { title: 'كتاب المراقبة' })
    const article = await createTestArticle(payload)
    await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 4, comment: 'كتاب جيد' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'reviews',
      data: { user: member.id, article: article.id, rating: 2, comment: 'مقال' },
      overrideAccess: true,
    })

    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })
    const extension = await payload.create({
      collection: 'loan-extensions',
      data: { loan: loan.id, user: member.id, days: 7, reason: 'امتحانات' },
      overrideAccess: true,
    })

    // Nobody is waiting for the book: the same rule that auto-approves a member's
    // request makes this one available to accept.
    const empty = await getAdminUserHistory(member.id)
    expect(empty.extensions.docs[0]).toMatchObject({
      id: extension.id,
      status: 'pending',
      days: 7,
      bookTitle: book.title,
      waitingForBook: 0,
    })
    expect(empty.reviews.docs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetType: 'book', targetTitle: book.title, rating: 4 }),
        expect.objectContaining({ targetType: 'article', targetTitle: article.title, rating: 2 }),
      ]),
    )
    expect(empty.reviews.total).toBe(2)

    await payload.create({
      collection: 'waitlist-entries',
      data: { book: book.id, user: admin.id, position: 1 },
      overrideAccess: true,
    })

    const busy = await getAdminUserHistory(member.id)
    expect(busy.extensions.docs[0].waitingForBook).toBe(1)
  })

  it('decides a pending extension from the user detail screen', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload)
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })
    await payload.create({
      collection: 'loan-extensions',
      data: { loan: loan.id, user: member.id, days: 5 },
      overrideAccess: true,
    })

    const before = await getAdminUserHistory(member.id)
    await expect(approveExtension(before.extensions.docs[0].id)).resolves.toEqual({ ok: true })

    const after = await getAdminUserHistory(member.id)
    expect(after.extensions.docs[0].status).toBe('approved')
  })

  it('returns empty lists for a member with no history', async () => {
    await loginAs(admin)
    const fresh = await createTestUser(payload, { email: 'fresh@user-detail-int.usthb.dz' })

    await expect(getAdminUserHistory(fresh.id)).resolves.toEqual({
      borrowings: { docs: [], total: 0 },
      reviews: { docs: [], total: 0 },
      extensions: { docs: [] },
    })
  })
})
