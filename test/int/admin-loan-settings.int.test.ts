import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getTestPayload, resetDatabase } from '../setup-integration'
import { createTestBook, createTestLoan } from '../lib/factories'
import { createTestUser, ctxFor, loginToken } from '../lib/seed'
import { clearNextContext, makeAuthHeaders, setNextHeaders } from '../lib/next-stubs'
import {
  getAdminLoanSettings,
  updateAdminLoanSettings,
} from '@/features/admin/server/loan-settings'
import { getLoanSettings } from '@/shared/lib/settings'
import { LogAction } from '@/features/admin/server/logs-core'

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

async function seedActiveLoans(count: number) {
  for (let index = 0; index < count; index += 1) {
    const book = await createTestBook(payload, { title: `كتاب ${index}` })
    await createTestLoan(payload, {
      book: book.id,
      user: member.id,
      status: 'picked_up',
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })
  }
}

beforeEach(async () => {
  payload = await getTestPayload()
  await resetDatabase()
  clearNextContext()
  admin = await createTestUser(payload, {
    role: 'admin',
    email: 'admin@loan-settings-int.usthb.dz',
    verified: true,
  })
  member = await createTestUser(payload, {
    email: 'member@loan-settings-int.usthb.dz',
    verified: true,
  })
})

afterAll(async () => {
  await payload.db.destroy?.()
})

describe('admin loan settings (#156)', () => {
  it('refuses non-admins', async () => {
    await loginAs(member)
    await expect(getAdminLoanSettings()).rejects.toThrow('Unauthorized')
    await expect(
      updateAdminLoanSettings({ defaultLoanDurationDays: 21, borrowLimit: 5 }),
    ).rejects.toThrow('Unauthorized')
  })

  it('reads the Settings global the enforcement code already reads', async () => {
    await loginAs(admin)

    const settings = await getAdminLoanSettings()
    expect(settings.defaultLoanDurationDays).toBe(14)
    expect(settings.borrowLimit).toBe(3)

    // Same helper the gates use, so the panel cannot drift from enforcement.
    const enforcement = await getLoanSettings(payload)
    expect(enforcement.defaultLoanDurationDays).toBe(settings.defaultLoanDurationDays)
    expect(enforcement.borrowLimit).toBe(settings.borrowLimit)
  })

  it('writes both values and audits the change', async () => {
    await loginAs(admin)

    await expect(
      updateAdminLoanSettings({ defaultLoanDurationDays: 21, borrowLimit: 5 }),
    ).resolves.toEqual({ ok: true })

    const global = await payload.findGlobal({ slug: 'settings', overrideAccess: true, depth: 0 })
    expect(global.defaultLoanDurationDays).toBe(21)
    expect(global.borrowLimit).toBe(5)

    const logs = await payload.find({
      collection: 'logs',
      where: { action: { equals: LogAction.LoanSettingsUpdated } },
      overrideAccess: true,
    })
    expect(logs.docs).toHaveLength(1)
    expect(logs.docs[0].metadata).toMatchObject({
      before: { defaultLoanDurationDays: 14, borrowLimit: 3 },
      after: { defaultLoanDurationDays: 21, borrowLimit: 5 },
    })
  })

  it('refuses values that are not whole positive days or books', async () => {
    await loginAs(admin)

    await expect(
      updateAdminLoanSettings({ defaultLoanDurationDays: 0, borrowLimit: 3 }),
    ).resolves.toMatchObject({ ok: false })
    await expect(
      updateAdminLoanSettings({ defaultLoanDurationDays: 14, borrowLimit: 1.5 }),
    ).resolves.toMatchObject({ ok: false })
    await expect(
      updateAdminLoanSettings({ defaultLoanDurationDays: 400, borrowLimit: 99 }),
    ).resolves.toMatchObject({ ok: false })

    const global = await payload.findGlobal({ slug: 'settings', overrideAccess: true, depth: 0 })
    expect(global.defaultLoanDurationDays).toBe(14)
    expect(global.borrowLimit).toBe(3)
    expect(
      (await payload.count({ collection: 'logs', where: {}, overrideAccess: true })).totalDocs,
    ).toBe(0)
  })

  it('takes effect on the next loan: the new duration and limit are what the gates read', async () => {
    await loginAs(admin)
    await updateAdminLoanSettings({ defaultLoanDurationDays: 21, borrowLimit: 2 })

    const { checkRequestGates } = await import('@/shared/lib/loan-gates')
    const ctx = await ctxFor(payload, member)
    await seedActiveLoans(2)

    // At the limit the gate refuses, and what it counts is the active-loan
    // budget — the same statuses the borrow limit is defined over.
    const freshBook = await createTestBook(payload)
    const atLimit = await checkRequestGates(ctx, freshBook.id)
    expect(atLimit).toEqual({
      ok: false,
      message: 'لقد وصلت إلى الحد الأقصى لعدد الكتب المستعارة',
    })

    await updateAdminLoanSettings({ defaultLoanDurationDays: 21, borrowLimit: 4 })
    await expect(checkRequestGates(ctx, freshBook.id)).resolves.toEqual({ ok: true })

    // The duration lands on the next loan picked up: the due date the lifecycle
    // hook stamps comes from the Settings global the panel just wrote.
    const { markLoanPickedUpLogic } = await import('@/features/library/server/loan-transitions')
    const durationBook = await createTestBook(payload, { title: 'مدّته من الإعدادات' })
    const loan = await createTestLoan(payload, {
      book: durationBook.id,
      user: member.id,
      status: 'accepted',
    })
    await expect(
      markLoanPickedUpLogic(loan.id, await ctxFor(payload, admin)),
    ).resolves.toMatchObject({ success: true })

    const pickedUp = await payload.findByID({
      collection: 'loans',
      id: loan.id,
      overrideAccess: true,
      depth: 0,
    })
    const expected = Date.now() + 21 * 24 * 60 * 60 * 1000
    expect(new Date(pickedUp.dueDate ?? '').getTime()).toBeGreaterThan(expected - 60_000)
    expect(new Date(pickedUp.dueDate ?? '').getTime()).toBeLessThan(expected + 60_000)
  })
})
