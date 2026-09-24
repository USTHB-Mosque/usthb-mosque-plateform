'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'

export async function getPendingVerifications() {
  const { payload, user } = await getAdminCtx()

  const result = await payload.find({
    collection: 'users',
    where: { verificationStatus: { equals: 'pending_verification' } },
    sort: '-createdAt',
    depth: 1,
    overrideAccess: false,
    user,
  })

  return result.docs
}

export async function approveUser(userId: number) {
  const { payload, user } = await getAdminCtx()

  await payload.update({
    collection: 'users',
    id: userId,
    data: { verificationStatus: 'verified' },
    overrideAccess: false,
    user,
    disableTransaction: true,
  })

  revalidatePath('/admin-panel/users')
  revalidatePath('/admin-panel/users/pending')
  revalidatePath('/admin-panel/verification')
  revalidatePath(`/admin-panel/users/${userId}`)
  return { ok: true }
}

export async function rejectUser(userId: number, note?: string) {
  const { payload, user } = await getAdminCtx()

  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      verificationStatus: 'rejected',
      verificationNote: note || 'تم رفض الطلب',
    },
    overrideAccess: false,
    user,
    disableTransaction: true,
  })

  revalidatePath('/admin-panel/users')
  revalidatePath('/admin-panel/users/pending')
  revalidatePath('/admin-panel/verification')
  revalidatePath(`/admin-panel/users/${userId}`)
  return { ok: true }
}
