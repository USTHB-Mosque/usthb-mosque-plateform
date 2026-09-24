import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { ACTIVE_LOAN_STATUSES } from '@/utils/constants/loans'
import { getLoanSettings } from '@/shared/lib/settings'

export type GateResult = { ok: true } | { ok: false; message: string }

export interface RequestGatesCtx {
  payload: Payload
  user: User
  req: PayloadRequest
}

/**
 * The request gates every loan request must pass (#19), shared by the
 * `borrowBook` transition (which turns failures into Arabic result messages)
 * and the `loans` collection create guard (which throws so the REST surface
 * cannot bypass them). Order matters: verification first, then the borrow
 * budget, then the per-book duplicates.
 */
export async function checkRequestGates(ctx: RequestGatesCtx, bookId: number): Promise<GateResult> {
  const { payload, user, req } = ctx

  if (user.verificationStatus !== 'verified') {
    return { ok: false, message: 'يجب تأكيد حسابك قبل استعارة الكتب' }
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
