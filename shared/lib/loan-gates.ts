import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'
import { getLoanSettings } from '@/shared/lib/settings'
import type { ActionCtx } from '@/shared/lib/auth'
import type { User } from '@/payload-types'

export type GateResult = { ok: true } | { ok: false; message: string }

/**
 * Suspension (SPEC §4, CONTEXT.md): a late book bars new loans until it is
 * returned. Derived from `dueDate`, never stored — the state lifts the moment
 * the book comes back, so there is no flag left behind to forget to clear.
 */
export const OVERDUE_SUSPENSION_MESSAGE = 'لديك إعارة متأخرة — لا يمكن طلب إعارات جديدة قبل إرجاعها'

/** Collected books leave only to verified members (SPEC §4). */
export const UNVERIFIED_PICKUP_MESSAGE =
  'حساب المستلم غير موثّق — لا يمكن تسجيل استلام الكتب قبل توثيق الحساب'

/**
 * The request gates every loan request must pass (#19, #153), shared by the
 * `borrowBook` transition (which turns failures into Arabic result messages)
 * and the `loans` collection create guard (which throws so the REST surface
 * cannot bypass them). Order matters: the suspension first — a penalty checked
 * behind the budget would be a penalty members could stay comfortably under —
 * then the borrow budget, then the per-book duplicates.
 *
 * Verification is deliberately absent. SPEC §4 lets an unverified member
 * browse, request and waitlist, and blocks them at collection instead
 * (`checkPickupGate`); it used to sit here, turning away members whose only
 * fault was a document nobody had reviewed yet, and leaving nobody at the
 * desk to tell them so.
 */
export async function checkRequestGates(ctx: ActionCtx, bookId: number): Promise<GateResult> {
  const { payload, user, req } = ctx

  const overdue = await payload.count({
    collection: 'loans',
    where: {
      and: [
        { user: { equals: user.id } },
        { status: { equals: 'picked_up' } },
        { dueDate: { less_than: new Date().toISOString() } },
      ],
    },
    req,
    overrideAccess: true,
  })
  if (overdue.totalDocs > 0) {
    return { ok: false, message: OVERDUE_SUSPENSION_MESSAGE }
  }

  const { borrowLimit } = await getLoanSettings(payload, req)
  const active = await payload.count({
    collection: 'loans',
    where: {
      and: [{ user: { equals: user.id } }, { status: { in: [...ACTIVE_LOAN_STATUSES] } }],
    },
    req,
    overrideAccess: true,
  })
  if (active.totalDocs >= borrowLimit) {
    return { ok: false, message: 'لقد وصلت إلى الحد الأقصى لعدد الكتب المستعارة' }
  }

  const duplicateLoan = await payload.find({
    collection: 'loans',
    where: {
      and: [
        { user: { equals: user.id } },
        { book: { equals: bookId } },
        { status: { in: [...ACTIVE_LOAN_STATUSES] } },
      ],
    },
    req,
    overrideAccess: true,
    limit: 1,
    depth: 0,
  })
  if (duplicateLoan.docs.length > 0) {
    return { ok: false, message: 'لديك بالفعل طلب إعارة نشط لهذا الكتاب' }
  }

  const duplicateWaitlist = await payload.count({
    collection: 'waitlist-entries',
    where: {
      and: [{ user: { equals: user.id } }, { book: { equals: bookId } }],
    },
    req,
    overrideAccess: true,
  })
  if (duplicateWaitlist.totalDocs > 0) {
    return { ok: false, message: 'أنت بالفعل في قائمة الانتظار لهذا الكتاب' }
  }

  return { ok: true }
}

/**
 * The collection gate (#153, SPEC §4): an unverified member browses, requests
 * and queues like anyone else, but no book leaves the mosque on their name.
 *
 * Two callers, deliberately different reactions. The admin transition runs it
 * and returns a plain failure so it can tell the admins what happened — it
 * fails *before* writing, so a notification survives. The `loans` afterChange
 * hook runs it and throws, closing the Payload admin surface, which reaches
 * `picked_up` without passing through that transition; it must not notify,
 * because an alert written inside the transaction it is about to abort would
 * roll back with the operation it is reporting.
 */
export function checkPickupGate(
  borrower: Pick<User, 'verificationStatus'> | null | undefined,
): GateResult {
  if (borrower?.verificationStatus !== 'verified') {
    return { ok: false, message: UNVERIFIED_PICKUP_MESSAGE }
  }
  return { ok: true }
}
