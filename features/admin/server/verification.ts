'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'

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
  await writeLog(payload, user, {
    action: LogAction.UserVerified,
    targetType: 'user',
    targetId: userId,
    message: `وثّق حساب عضو #${userId}`,
  })
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
  await writeLog(payload, user, {
    action: LogAction.UserRejected,
    targetType: 'user',
    targetId: userId,
    message: `رفض توثيق حساب عضو #${userId}`,
  })
  return { ok: true }
}
