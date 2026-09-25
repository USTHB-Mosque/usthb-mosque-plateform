import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

import { getAdminDashboardStats } from '@/features/admin/server/dashboard'

let payload: Payload
let admin: User

async function loginAs(email: string, password = 'correct horse battery') {
  const { token } = await loginToken(payload, { email, password })
  setNextHeaders(makeAuthHeaders(token))
}

async function seedBook() {
  return payload.create({
    collection: 'books',
    data: {
      title: 'الفوائد لابن القيم',
      author: 'ابن قيم الجوزية',
      shortDescription: 'مجموعة فوائد',
      type: ['aqidah'],
      category: 'religious',
      code: 'تز/02/16',
      isbn: '978-99999-0000-1',
      totalBooks: 3,
      availableBooks: 3,
    },
    overrideAccess: true,
  })
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  admin = await createTestUser(payload, {
    role: 'admin',
    email: 'admin@dashboard-int.usthb.dz',
    verified: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('getAdminDashboardStats access control', () => {
  it('refuses an anonymous caller', async () => {
    await expect(getAdminDashboardStats()).rejects.toThrow('Unauthorized')
  })

  it('refuses a non-admin member', async () => {
    const member = await createTestUser(payload, {
      email: 'member@dashboard-int.usthb.dz',
      verified: true,
    })
    await loginAs(member.email ?? '')

    await expect(getAdminDashboardStats()).rejects.toThrow('Unauthorized')
  })
})

describe('getAdminDashboardStats KPI counts', () => {
  it('aggregates every KPI against the seeded rows', async () => {
    await loginAs(admin.email ?? '')

    const book = await seedBook()
    const member = await createTestUser(payload, {
      email: 'borrower@dashboard-int.usthb.dz',
      verified: true,
    })
    // Pending verification account
    await createTestUser(payload, { email: 'unverified@dashboard-int.usthb.dz' })

    await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'pending',
        loanDate: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    // Severe overdue: still held, due more than 7 days ago.
    await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'picked_up',
        loanDate: daysFromNow(-20),
        dueDate: daysFromNow(-10),
      },
      overrideAccess: true,
    })

    // Upcoming return: held, due in the future.
    const futureLoan = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'picked_up',
        loanDate: daysFromNow(-5),
        dueDate: daysFromNow(5),
      },
      overrideAccess: true,
    })

    // Pending extension on the future loan.
    await payload.create({
      collection: 'loan-extensions',
      data: { loan: futureLoan.id, user: member.id, days: 5, status: 'pending' },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'reviews',
      data: { user: member.id, book: book.id, rating: 5, comment: 'كتاب مفيد' },
      overrideAccess: true,
    })

    const data = await getAdminDashboardStats()

    expect(data.stats).toEqual({
      pendingLoans: 1,
      pendingExtensions: 1,
      severeOverdue: 1,
      pendingVerifications: 1,
    })

    expect(data.upcomingReturns).toHaveLength(1)
    expect(String(data.upcomingReturns[0].id)).toBe(String(futureLoan.id))
    expect(data.upcomingReturns[0].status).toBe('picked_up')

    expect(data.latestReviews).toHaveLength(1)
    expect(data.latestReviews[0].rating).toBe(5)
  })

  it('sorts upcoming returns by due date ascending and excludes past due dates', async () => {
    await loginAs(admin.email ?? '')

    const book = await seedBook()
    const member = await createTestUser(payload, {
      email: 'borrower2@dashboard-int.usthb.dz',
      verified: true,
    })

    await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'accepted',
        loanDate: daysFromNow(-3),
        dueDate: daysFromNow(-1),
      },
      overrideAccess: true,
    })
    const far = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'picked_up',
        loanDate: daysFromNow(-4),
        dueDate: daysFromNow(9),
      },
      overrideAccess: true,
    })
    const near = await payload.create({
      collection: 'loans',
      data: {
        book: book.id,
        user: member.id,
        status: 'picked_up',
        loanDate: daysFromNow(-2),
        dueDate: daysFromNow(2),
      },
      overrideAccess: true,
    })

    const data = await getAdminDashboardStats()

    expect(data.upcomingReturns.map((loan) => String(loan.id))).toEqual([
      String(near.id),
      String(far.id),
    ])
  })
})
