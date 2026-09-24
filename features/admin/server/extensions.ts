'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import { getPayloadWithUser } from '@/shared/lib/auth'

export async function requestExtension(loanId: number, days: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false, error: 'غير مصرح' }

  const { payload, user, req } = ctx

  const loan = await payload.findByID({
    collection: 'loans',
    id: loanId,
    depth: 1,
    req,
    overrideAccess: false,
  })

  const ownerId =
    typeof loan.user === 'object' && loan.user !== null
      ? (loan.user as { id: number }).id
      : loan.user
  if (String(ownerId) !== String(user.id)) {
    return { ok: false, error: 'غير مصرح' }
  }

  if (loan.status !== 'approved') {
    return { ok: false, error: 'الإعارة غير نشطة' }
  }

  if (loan.extensionRequest?.status === 'pending') {
    return { ok: false, error: 'يوجد طلب تمديد معلق بالفعل' }
  }

  const currentDue = new Date(loan.dueDate)
  const newDue = new Date(currentDue.getTime() + days * 24 * 60 * 60 * 1000)

  await payload.update({
    collection: 'loans',
    id: loanId,
    data: {
      extensionRequest: {
        status: 'pending',
        requestedDays: days,
        requestedAt: new Date().toISOString(),
        newDueDate: newDue.toISOString(),
      },
    },
    req,
    overrideAccess: false,
  })

  revalidatePath('/user/my-loans')
  revalidatePath('/admin-panel/dashboard')
  return { ok: true }
}

export async function resolveExtensionRequest(loanId: number, approve: boolean) {
  const { payload, user } = await getAdminCtx()

  const loan = await payload.findByID({
    collection: 'loans',
    id: loanId,
    depth: 1,
    overrideAccess: false,
    user,
  })

  if (loan.extensionRequest?.status !== 'pending') {
    return { ok: false, error: 'لا يوجد طلب معلق' }
  }

  const updateData: Record<string, unknown> = {
    extensionRequest: {
      ...loan.extensionRequest,
      status: approve ? 'approved' : 'rejected',
      resolvedAt: new Date().toISOString(),
    },
  }

  if (approve && loan.extensionRequest.newDueDate) {
    updateData.dueDate = loan.extensionRequest.newDueDate
  }

  await payload.update({
    collection: 'loans',
    id: loanId,
    data: updateData,
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin-panel/dashboard')
  revalidatePath('/admin-panel/loans/pending')
  return { ok: true }
}
