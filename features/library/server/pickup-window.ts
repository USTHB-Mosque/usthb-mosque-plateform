import type { Payload, PayloadRequest } from 'payload'
import type { Loan, User } from '@/payload-types'

import { LogAction } from '@/collections/Log'
import { resolveRelationId } from '@/shared/lib/relations'
import {
  NO_SHOW_LIMIT,
  PICKUP_WINDOW_EXPIRED,
  PICKUP_WINDOW_EXPIRY_REASON,
} from '@/utils/constants/loans'

export interface PickupWindowCtx {
  payload: Payload
  req: PayloadRequest
  /** Override the current time so a test can drive the sweep to an instant. */
  now?: Date
}

/**
 * Refuses every accepted Loan whose Pickup Window has lapsed (#153, D1).
 *
 * The refusal itself is a single `update`, which the `loans` lifecycle hook
 * already handles: it releases the reserved copy, promotes the Waitlist head
 * and tells both parties. This sweep only adds what the hook cannot know —
 * that the refusal was a no-show, so the borrower's D2 counter moves, and an
 * audit row, because the SPEC justifies the absence of a per-no-show history
 * collection on the grounds that the audit log records each expiry.
 *
 * Runs on the Payload jobs queue (see `jobs.ts`) and again lazily on the reads
 * that surface pickup state, so a member or an admin reading a stale queue
 * never sees a window that has already lapsed.
 *
 * Idempotent by construction: the query only ever selects `accepted` loans, so
 * a loan refused once can never be counted twice.
 */
export async function expirePickupWindows(ctx: PickupWindowCtx): Promise<number> {
  const { payload, req } = ctx
  const now = ctx.now ?? new Date()

  const expired = await payload.find({
    collection: 'loans',
    where: {
      and: [
        { status: { equals: 'accepted' } },
        { pickupWindowExpiresAt: { exists: true } },
        { pickupWindowExpiresAt: { less_than: now.toISOString() } },
      ],
    },
    sort: 'pickupWindowExpiresAt',
    limit: 0,
    depth: 0,
    req,
    overrideAccess: true,
  })

  for (const loan of expired.docs as Loan[]) {
    await expireOneLoan(payload, req, loan, now)
  }

  return expired.docs.length
}

async function expireOneLoan(
  payload: Payload,
  req: PayloadRequest,
  loan: Loan,
  now: Date,
): Promise<void> {
  const bookId = resolveRelationId(loan.book)
  const userId = resolveRelationId(loan.user)

  const book = await payload.findByID({
    collection: 'books',
    id: bookId,
    depth: 0,
    req,
    overrideAccess: true,
  })

  // The flag tells the lifecycle hook to send the no-show story rather than
  // the generic refusal message, so the borrower gets one notification, not two.
  await payload.update({
    collection: 'loans',
    id: loan.id,
    data: {
      status: 'refused',
      refusalReason: PICKUP_WINDOW_EXPIRY_REASON,
    },
    req,
    overrideAccess: true,
    context: { [PICKUP_WINDOW_EXPIRED]: true },
  })

  await countNoShow(payload, req, userId, now)

  await payload.create({
    collection: 'logs',
    data: {
      action: LogAction.LoanExpired,
      targetType: 'loan',
      targetId: String(loan.id),
      timestamp: now.toISOString(),
      message: `انتهت مدة استلام «${book.title}» قبل التسجيل — أعيد الكتاب إلى الرفوف.`,
      metadata: {
        reason: PICKUP_WINDOW_EXPIRY_REASON,
        windowExpiredAt: loan.pickupWindowExpiresAt,
      },
    },
    req,
    overrideAccess: true,
  })
}

/**
 * D2: one no-show per lapsed window; the second one blocks borrowing until an
 * admin lifts it. The block timestamp is only ever written the first time the
 * threshold is crossed, so a third no-show cannot silently restart the clock
 * on a block an admin is already looking at.
 */
async function countNoShow(
  payload: Payload,
  req: PayloadRequest,
  userId: number,
  now: Date,
): Promise<void> {
  const borrower = (await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
    req,
    overrideAccess: true,
  })) as User

  const noShowCount = (borrower.noShowCount ?? 0) + 1
  const alreadyBlocked = Boolean(borrower.borrowingBlockedAt)
  const crossesThreshold = noShowCount >= NO_SHOW_LIMIT

  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      noShowCount,
      ...(crossesThreshold && !alreadyBlocked ? { borrowingBlockedAt: now.toISOString() } : {}),
    },
    req,
    overrideAccess: true,
  })
}
