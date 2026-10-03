import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { boundReq, getTestPayload, resetDatabase } from '../setup-integration'
import {
  createTestActivity,
  createTestArticle,
  createTestBook,
  createTestLoan,
} from '../lib/factories'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { getAdminAnalytics } from '@/features/admin/server/analytics'
import { recordArticleRead } from '@/features/articles/server/article-reads'

let payload: Payload
let admin: User
let member: User
let other: User

async function loginAs(user: User) {
  const { token } = await loginToken(payload, {
    email: user.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))
}

/** A loan a few days into the past, so `from` can exclude it. */
function daysAgo(days: number, hour = 10): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  admin = await createTestUser(payload, { role: 'admin', email: 'admin@an-int.usthb.dz' })
  member = await createTestUser(payload, { email: 'member@an-int.usthb.dz', verified: true })
  other = await createTestUser(payload, { email: 'other@an-int.usthb.dz', verified: true })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('admin analytics (#156)', () => {
  it('refuses non-admins', async () => {
    await loginAs(member)
    await expect(getAdminAnalytics()).rejects.toThrow('Unauthorized')
  })

  it('most-borrowed books counts collected loans, not refused requests', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload, { title: 'صحيح مسلم' })
    const borrowed = await createTestBook(payload, { title: 'الرحيق' })

    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'returned',
      loanDate: daysAgo(2),
    })
    await createTestLoan(payload, {
      book: book.id,
      user: other.id,
      status: 'picked_up',
      loanDate: daysAgo(2),
    })
    await createTestLoan(payload, {
      book: book.id,
      user: other.id,
      status: 'refused',
      loanDate: daysAgo(2),
    })
    await createTestLoan(payload, {
      book: borrowed.id,
      user: member.id,
      status: 'returned',
      loanDate: daysAgo(2),
    })

    const result = await getAdminAnalytics({ from: daysAgo(30) })

    expect(result.topBorrowedBooks[0]).toMatchObject({ title: 'صحيح مسلم', loans: 2 })
    expect(result.topBorrowedBooks[1]).toMatchObject({ title: 'الرحيق', loans: 1 })
    expect(result.topRequestedBooks[0]).toMatchObject({ title: 'صحيح مسلم', requests: 3 })
  })

  it('monthly evolution groups by month rather than day', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id, loanDate: daysAgo(3, 9) })
    await createTestLoan(payload, { book: book.id, user: member.id, loanDate: daysAgo(2, 11) })
    await createTestLoan(payload, { book: book.id, user: member.id, loanDate: daysAgo(1, 13) })

    const result = await getAdminAnalytics({ from: daysAgo(90) })

    const months = result.monthlyBorrowings.map((row) => new Date(row.month).getMonth())
    expect(new Set(months).size).toBeLessThanOrEqual(months.length)
    expect(result.monthlyBorrowings.reduce((sum, row) => sum + row.loans, 0)).toBe(3)
    expect(result.monthlyBorrowings.length).toBeLessThanOrEqual(3)
  })

  it('reports pickup peaks by hour and weekday from real pickup dates', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload)
    const morning = new Date()
    morning.setHours(9, 0, 0, 0)
    const evening = new Date()
    evening.setHours(19, 0, 0, 0)

    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupDate: morning.toISOString(),
      pickupHour: '09:00',
    })
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupDate: evening.toISOString(),
      pickupHour: '19:00',
    })

    const result = await getAdminAnalytics({ from: daysAgo(30) })

    expect(result.pickupHours).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pickups: 1 }),
        expect.objectContaining({ pickups: 1 }),
      ]),
    )
    expect(result.pickupHours.reduce((sum, row) => sum + row.pickups, 0)).toBe(2)
    expect(result.pickupWeekdays.reduce((sum, row) => sum + row.pickups, 0)).toBe(2)
  })

  it('reports article reads, reviews and favourites, and the most-interacted article', async () => {
    await loginAs(admin)
    const quiet = await createTestArticle(payload, { title: 'مقال هادئ' })
    const loud = await createTestArticle(payload, { title: 'مقال صاخب' })

    await recordArticleRead(payload, quiet.id, member)
    await recordArticleRead(payload, loud.id, member)
    await recordArticleRead(payload, loud.id, member)
    await recordArticleRead(payload, loud.id, other)
    await payload.create({
      collection: 'reviews',
      data: { user: member.id, article: quiet.id, rating: 5 },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'reviews',
      data: { user: member.id, article: loud.id, rating: 4 },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'article-favorites',
      data: { article: loud.id, user: member.id },
      req: await boundReq(payload, member),
      overrideAccess: false,
    })

    const result = await getAdminAnalytics({ from: daysAgo(30) })

    expect(result.articleEngagement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'مقال صاخب',
          reads: 3,
          reviews: 1,
          favorites: 1,
          interactions: 5,
        }),
        expect.objectContaining({
          title: 'مقال هادئ',
          reads: 1,
          reviews: 1,
          favorites: 0,
          interactions: 2,
        }),
      ]),
    )
    expect(result.topArticleByInteraction).toMatchObject({ title: 'مقال صاخب', interactions: 5 })
  })

  it('reports activity registrations and feedback sentiment', async () => {
    await loginAs(admin)
    const busy = await createTestActivity(payload, { title: 'نشاط مزدحم' })
    const quiet = await createTestActivity(payload, { title: 'نشاط هادئ' })

    for (const user of [member, other]) {
      await payload.create({
        collection: 'activity-registrations',
        data: { activity: busy.id, user: user.id, status: 'accepted' },
        overrideAccess: true,
      })
    }
    await payload.create({
      collection: 'activity-registrations',
      data: { activity: quiet.id, user: member.id, status: 'pending' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity-feedback',
      data: { activity: busy.id, user: member.id, sentiment: 'positive', comment: 'ممتاز' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity-feedback',
      data: { activity: quiet.id, user: other.id, sentiment: 'negative', comment: 'ضعيف' },
      overrideAccess: true,
    })

    const result = await getAdminAnalytics({ from: daysAgo(30) })

    expect(result.activityRegistrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'نشاط مزدحم', registrations: 2 }),
        expect.objectContaining({ title: 'نشاط هادئ', registrations: 1 }),
      ]),
    )
    expect(result.activityFeedback).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'نشاط مزدحم', positive: 1, negative: 0 }),
        expect.objectContaining({ title: 'نشاط هادئ', positive: 0, negative: 1 }),
      ]),
    )
  })

  it('the period actually narrows the range', async () => {
    await loginAs(admin)
    const book = await createTestBook(payload)
    await createTestLoan(payload, { book: book.id, user: member.id, loanDate: daysAgo(2, 10) })
    await createTestLoan(payload, { book: book.id, user: other.id, loanDate: daysAgo(200, 10) })

    const wide = await getAdminAnalytics({ from: daysAgo(400) })
    const narrow = await getAdminAnalytics({ from: daysAgo(30) })

    expect(wide.topRequestedBooks[0].requests).toBe(2)
    expect(narrow.topRequestedBooks[0].requests).toBe(1)
    expect(narrow.from).not.toBe(wide.from)
  })
})
