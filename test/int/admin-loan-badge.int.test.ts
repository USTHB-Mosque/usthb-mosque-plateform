import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestUser, loginToken } from '../lib/seed'
import { createTestBook, createTestLoan } from '../lib/factories'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import { getPendingLoansCount } from '@/features/admin/server/loans'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'

let payload: Payload
let admin: User
let member: User

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()

  admin = await createTestUser(payload, { role: 'admin', email: 'admin@badge-int.usthb.dz' })
  member = await createTestUser(payload, { verified: true })

  const { token } = await loginToken(payload, {
    email: admin.email ?? '',
    password: 'correct horse battery',
  })
  setNextHeaders(makeAuthHeaders(token))

  vi.spyOn(payload, 'sendEmail')
    .mockImplementation(async () => undefined)
    .mockClear()
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('getPendingLoansCount', () => {
  it('counts only the loans still waiting on an admin decision (#65)', async () => {
    const book = await createTestBook(payload, { available: 3, total: 3 })
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'pending' })
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'accepted' })
    await createTestLoan(payload, { book: book.id, user: member.id, status: 'returned' })

    await expect(getPendingLoansCount()).resolves.toBe(2)
  })

  it('is zero on a quiet desk, so the sidebar can hide the badge', async () => {
    await expect(getPendingLoansCount()).resolves.toBe(0)
  })

  it('does not mutate loans the way the stats sweep does', async () => {
    // `getAdminLoansStats` drains the pickup-window queue before it counts, so
    // it writes. The badge runs on every admin page render and must stay a
    // pure read — this is the assertion that keeps it from growing that write.
    const book = await createTestBook(payload, { available: 1, total: 1 })
    const loan = await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'accepted',
      pickupWindowExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    })

    await getPendingLoansCount()

    const after = await payload.findByID({
      collection: 'loans',
      id: loan.id,
      overrideAccess: true,
      depth: 0,
    })
    expect(after.status).toBe('accepted')
  })

  it('refuses a member caller', async () => {
    const { token } = await loginToken(payload, {
      email: member.email ?? '',
      password: 'correct horse battery',
    })
    setNextHeaders(makeAuthHeaders(token))

    await expect(getPendingLoansCount()).rejects.toThrow(/Unauthorized/i)
  })
})
