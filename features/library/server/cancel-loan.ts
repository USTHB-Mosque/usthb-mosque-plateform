'use server'

import { getPayloadWithUser, type ActionCtx } from '@/shared/lib/auth'
import { checkCancelGate } from '@/shared/lib/loan-gates'
import { resolveRelationId } from '@/shared/lib/relations'
import { LogAction } from '@/collections/Log'
import type { Loan } from '@/payload-types'
import type { LoanActionResult } from './loan-transitions'

const NOT_LOGGED_IN = 'يجب تسجيل الدخول أولاً'
const GENERIC_ERROR = 'حدث خطأ أثناء إلغاء طلب الإعارة'
const NOT_OWNER = 'لا يمكنك إلغاء إعارة لست مالكها'

export type CancelCtx = ActionCtx

/**
 * D6 - Cancelability (#153): the borrower withdraws a Loan request they have
 * not collected yet. Exactly `pending` and `accepted` — see `checkCancelGate`.
 *
 * The write deliberately uses `overrideAccess: true`. `loans.access.update` is
 * admin-only because a borrower must never edit their own row (they would be
 * setting `status` and `dueDate` themselves), and widening that rule for one
 * action would widen it for all of them. So the rule stays untouched and this
 * action takes responsibility for everything it writes: it reads the row, checks
 * that the caller owns it and that the state allows cancelling, and then writes
 * a single fixed value. The caller supplies the id and nothing else — the same
 * reasoning that already lets `releaseAndPromote` and the extension auto-approve
 * write through admin-only rules. `req` keeps the write, the release-and-promote
 * hook and the audit row in one transaction.
 *
 * What it does *not* do is as deliberate as what it does: no notification to the
 * borrower (they are the one who cancelled), no `noShowCount` increment (D6
 * explicitly contrasts cancelling, which helps the queue, with a no-show, which
 * delays it), and no refusal reason (there is no administration decision to
 * explain — the status says `ملغى` and the audit row says who and which loan).
 */
export async function cancelLoanLogic(
  loanId: number | string,
  ctx: CancelCtx,
): Promise<LoanActionResult> {
  try {
    // Read regardless of the caller so the ownership check below can answer
    // "that is not your loan" instead of leaking a row-scoped 404.
    const loan = (await ctx.payload.findByID({
      collection: 'loans',
      id: loanId,
      req: ctx.req,
      overrideAccess: true,
      depth: 0,
    })) as Loan

    if (resolveRelationId(loan.user) !== ctx.user.id) {
      return { success: false, message: NOT_OWNER }
    }

    const gate = checkCancelGate(loan.status)
    if (!gate.ok) return { success: false, message: gate.message }

    await ctx.payload.update({
      collection: 'loans',
      id: loan.id,
      data: { status: 'cancelled' },
      req: ctx.req,
      overrideAccess: true,
    })

    await writeCancelLog(ctx, loan.id)

    return { success: true, message: 'تم إلغاء طلب الإعارة', loanId: loan.id }
  } catch (error) {
    console.error('Error cancelling a loan:', error)
    return { success: false, message: GENERIC_ERROR }
  }
}

/**
 * The audit row. `logs.access.create` is staff-only, so this bypasses it the
 * same way the transition above does — a member's own action still has to be
 * accountable to the desk, which is the entire point of an append-only log.
 *
 * The line names the loan rather than the book: two loans of the same title
 * are possible, and `targetId` is what the log screen links back to, so the id
 * is the unambiguous one to read. Reading a title here would also mean a second
 * query that could fail after the cancellation already succeeded.
 */
async function writeCancelLog(ctx: CancelCtx, loanId: number): Promise<void> {
  await ctx.payload.create({
    collection: 'logs',
    data: {
      actor: ctx.user.id,
      action: LogAction.LoanCancelled,
      targetType: 'loan',
      targetId: String(loanId),
      timestamp: new Date().toISOString(),
      message: `ألغى العضو طلب إعارة رقم ${loanId}`,
    },
    req: ctx.req,
    overrideAccess: true,
  })
}

export async function cancelLoan(loanId: number | string): Promise<LoanActionResult> {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { success: false, message: NOT_LOGGED_IN }
  return cancelLoanLogic(loanId, ctx)
}
