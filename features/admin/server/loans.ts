'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import {
  acceptLoan,
  markLoanReturned as libraryMarkLoanReturned,
  refuseLoan,
} from '@/features/library'

const revalidateAdminLoans = () => {
  revalidatePath('/admin-panel/dashboard')
  revalidatePath('/admin-panel/loans/pending')
  revalidatePath('/admin-panel/loans/active')
  revalidatePath('/admin-panel/loans/overdue')
}

export async function getPendingLoans() {
  const { payload, user } = await getAdminCtx()

  const result = await payload.find({
    collection: 'loans',
    where: { status: { equals: 'pending' } },
    sort: '-createdAt',
    depth: 2,
    overrideAccess: false,
    user,
  })

  return result.docs
}

export async function getActiveLoans() {
  const { payload, user } = await getAdminCtx()

  const result = await payload.find({
    collection: 'loans',
    where: { status: { in: ['accepted', 'picked_up'] } },
    sort: '-createdAt',
    depth: 2,
    overrideAccess: false,
    user,
  })

  return result.docs
}

// Overdue is derived, not stored (#19): a picked-up loan is overdue once its
// `dueDate` passes. Refused/returned loans can never be overdue.
export async function getOverdueLoans() {
  const { payload, user } = await getAdminCtx()

  const result = await payload.find({
    collection: 'loans',
    where: {
      and: [
        { status: { in: ['accepted', 'picked_up'] } },
        { dueDate: { less_than: new Date().toISOString() } },
      ],
    },
    sort: '-createdAt',
    depth: 2,
    overrideAccess: false,
    user,
  })

  return result.docs
}

export async function approveLoan(loanId: number) {
  const result = await acceptLoan(loanId)
  if (!result.success) return { ok: false, error: result.message }
  revalidateAdminLoans()
  return { ok: true }
}

export async function rejectLoan(loanId: number, reason?: string) {
  const result = await refuseLoan(loanId, reason || 'رفض الطلب من قبل الإدارة')
  if (!result.success) return { ok: false, error: result.message }
  revalidateAdminLoans()
  return { ok: true }
}

// The `loans` afterChange hook releases the copy and promotes the waitlist
// head inside the same transaction; this wrapper only owns the transition.
export async function markLoanReturned(loanId: number) {
  const result = await libraryMarkLoanReturned(loanId)
  if (!result.success) return { ok: false, error: result.message }
  revalidateAdminLoans()
  return { ok: true }
}
