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
import { resolveRelationId } from '@/shared/lib/relations'

import type { Payload } from 'payload'
import type { Loan, LoanExtension, User } from '@/payload-types'

let payload: Payload
let admin: User
let member: User

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
