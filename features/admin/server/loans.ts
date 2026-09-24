'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'

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
    where: { status: { equals: 'approved' } },
    sort: '-createdAt',
    depth: 2,
    overrideAccess: false,
    user,
  })

  return result.docs
}

export async function getOverdueLoans() {
  const { payload, user } = await getAdminCtx()

  const result = await payload.find({
    collection: 'loans',
    where: { status: { equals: 'overdue' } },
    sort: '-createdAt',
    depth: 2,
    overrideAccess: false,
    user,
  })

  return result.docs
}

export async function approveLoan(loanId: number) {
  const { payload, user } = await getAdminCtx()

  await payload.update({
    collection: 'loans',
    id: loanId,
    data: { status: 'approved' },
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/collections/loans')
  return { ok: true }
}

export async function rejectLoan(loanId: number) {
  const { payload, user } = await getAdminCtx()

  await payload.delete({
    collection: 'loans',
    id: loanId,
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/collections/loans')
  return { ok: true }
}

export async function markLoanReturned(loanId: number) {
  const { payload, user } = await getAdminCtx()

  const loan = await payload.findByID({
    collection: 'loans',
    id: loanId,
    depth: 1,
    overrideAccess: false,
    user,
  })

  await payload.update({
    collection: 'loans',
    id: loanId,
    data: {
      status: 'returned',
      returnDate: new Date().toISOString(),
    },
    overrideAccess: false,
    user,
  })

  const book = loan.book as { id?: number; availableBooks?: number } | undefined
  if (book?.id) {
    await payload.update({
      collection: 'books',
      id: book.id,
      data: {
        availableBooks: (book.availableBooks || 0) + 1,
      },
      overrideAccess: false,
      user,
    })
  }

  revalidatePath('/admin')
  revalidatePath('/admin/collections/loans')
  return { ok: true }
}
