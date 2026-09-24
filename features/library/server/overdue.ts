'use server'
import type { Payload, PayloadRequest } from 'payload'
import type { Loan, User } from '@/payload-types'

import { createNotification } from '@/features/notifications'

/**
 * Overdue detection (#19), decided as a lazy check on read rather than a
 * scheduled job: loans are never stored as overdue — a `picked_up` loan past
 * its `dueDate` is overdue by derivation (see `getEffectiveLoanStatus`) and
 * this sync stamps `overdueNotified` so the borrower is notified exactly once.
 * It runs when the member portal reads loans (`getProfileDashboardData`).
 */
export async function syncOverdueLoans(ctx: {
  payload: Payload
  user: User
  req: PayloadRequest
}): Promise<number> {
  const { payload, user, req } = ctx

  const overdue = await payload.find({
    collection: 'loans',
    where: {
      and: [
        { user: { equals: user.id } },
        { status: { equals: 'picked_up' } },
        { dueDate: { less_than: new Date().toISOString() } },
        { overdueNotified: { not_equals: true } },
      ],
    },
    req,
    overrideAccess: false,
    depth: 0,
  })

  for (const loan of overdue.docs as Loan[]) {
    // System state driven by the derived overdue condition; joins the caller's
    // transaction through `req`.
    await payload.update({
      collection: 'loans',
      id: loan.id,
      data: { overdueNotified: true },
      req,
      overrideAccess: true,
    })

    const book = await payload.findByID({
      collection: 'books',
      id: loan.book as number,
      req,
      overrideAccess: false,
      depth: 0,
    })

    await createNotification({
      req,
      user: loan.user as number,
      type: 'loan',
      title: 'إعارة متأخرة',
      message: `مضى موعد إرجاع الكتاب «${book.title}» — يرجى إرجاعه في أقرب وقت.`,
      link: '/user/my-loans',
      email: true,
    })
  }

  return overdue.docs.length
}
