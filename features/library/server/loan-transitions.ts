'use server'
import { getPayloadWithUser, type ActionCtx } from '@/shared/lib/auth'
import { isAdmin } from '@/utils/access-helpers'
import type { Loan } from '@/payload-types'

export interface LoanActionResult {
  success: boolean
  message: string
  loanId?: number
}

const NOT_LOGGED_IN = 'يجب تسجيل الدخول أولاً'
const NOT_ADMIN = 'غير مصرح لك بتنفيذ هذا الإجراء'
const GENERIC_ERROR = 'حدث خطأ أثناء تحديث حالة الإعارة'

export type TransitionCtx = ActionCtx

/** Reads the loan for a transition's actor and state checks. */
async function readLoan(ctx: TransitionCtx, loanId: number | string) {
  const loan = (await ctx.payload.findByID({
    collection: 'loans',
    id: loanId,
    req: ctx.req,
    overrideAccess: false,
    depth: 0,
  })) as Loan

  return loan
}

/**
 * Accepts a pending loan (#19): reserves the copy and stamps the pickup code,
 * date and hour. The lifecycle hook on `loans` performs the stamps and the
 * reservation and notification; this transition owns actor/state checks.
 */
export async function acceptLoanLogic(
  loanId: number | string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const loan = await readLoan(ctx, loanId)

    if (loan.status !== 'pending') {
      return { success: false, message: 'لا يمكن قبول طلب ليس في حالة الانتظار' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'accepted' },
      req: ctx.req,
      overrideAccess: false,
    })

    return { success: true, message: 'تم قبول طلب الإعارة', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error accepting a loan:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/** Refuses a pending or accepted loan with a mandatory reason (#19). */
export async function refuseLoanLogic(
  loanId: number | string,
  reason: string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  if (!reason || !reason.trim()) {
    return { success: false, message: 'يجب إدخال سبب الرفض' }
  }

  try {
    const loan = await readLoan(ctx, loanId)

    if (loan.status !== 'pending' && loan.status !== 'accepted') {
      return { success: false, message: 'لا يمكن رفض إعارة بهذه الحالة' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'refused', refusalReason: reason },
      req: ctx.req,
      overrideAccess: false,
    })

    return { success: true, message: 'تم رفض طلب الإعارة', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error refusing a loan:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/** Marks an accepted loan as picked up; the due date is stamped by the hook. */
export async function markLoanPickedUpLogic(
  loanId: number | string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const loan = await readLoan(ctx, loanId)

    if (loan.status !== 'accepted') {
      return { success: false, message: 'لا يمكن تسجيل أخذ كتاب لطلب غير مقبول' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'picked_up' },
      req: ctx.req,
      overrideAccess: false,
    })

    return { success: true, message: 'تم تسجيل أخذ الكتاب', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error marking a loan picked up:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/**
 * Marks a picked-up loan returned. The lifecycle hook releases the copy and
 * promotes the waitlist head and notifies them inside the same transaction.
 */
export async function markLoanReturnedLogic(
  loanId: number | string,
  ctx: TransitionCtx,
): Promise<LoanActionResult> {
  if (!isAdmin(ctx.user)) return { success: false, message: NOT_ADMIN }

  try {
    const loan = await readLoan(ctx, loanId)

    if (loan.status !== 'picked_up') {
      return { success: false, message: 'لا يمكن إرجاع إعارة لم تؤخذ بعد' }
    }

    await ctx.payload.update({
      collection: 'loans',
      id: loanId,
      data: { status: 'returned' },
      req: ctx.req,
      overrideAccess: false,
    })

    return { success: true, message: 'تم تسجيل إرجاع الكتاب', loanId: Number(loanId) }
  } catch (error) {
    console.error('Error marking a loan returned:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

async function withAdminCtx(
  run: (ctx: TransitionCtx) => Promise<LoanActionResult>,
): Promise<LoanActionResult> {
  const ctx = await getPayloadWithUser({ allowAdmin: true })
  if (!ctx) return { success: false, message: NOT_LOGGED_IN }
  return run(ctx)
}

export async function acceptLoan(loanId: number | string) {
  return withAdminCtx((ctx) => acceptLoanLogic(loanId, ctx))
}

export async function refuseLoan(loanId: number | string, reason: string) {
  return withAdminCtx((ctx) => refuseLoanLogic(loanId, reason, ctx))
}

export async function markLoanPickedUp(loanId: number | string) {
  return withAdminCtx((ctx) => markLoanPickedUpLogic(loanId, ctx))
}

export async function markLoanReturned(loanId: number | string) {
  return withAdminCtx((ctx) => markLoanReturnedLogic(loanId, ctx))
}
