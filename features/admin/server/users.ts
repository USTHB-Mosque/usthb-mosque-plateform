'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import type { Where } from 'payload'

export { getAdminCtx }

export async function getAdminUsersStats() {
  const { payload, user } = await getAdminCtx()

  const base: Where = { deletedAt: { exists: false } }

  const [total, active, pending, inactive] = await Promise.all([
    payload.count({
      collection: 'users',
      where: base,
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'users',
      where: { and: [base, { verificationStatus: { equals: 'verified' } }] },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'users',
      where: { and: [base, { verificationStatus: { equals: 'pending_verification' } }] },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'users',
      where: {
        and: [
          base,
          {
            or: [
              { verificationStatus: { equals: 'rejected' } },
              { verificationStatus: { exists: false } },
            ],
          },
        ],
      },
      overrideAccess: false,
      user,
    }),
  ])

  return {
    stats: {
      totalUsers: total.totalDocs,
      activeAccounts: active.totalDocs,
      pendingJoinRequests: pending.totalDocs,
      inactiveAccounts: inactive.totalDocs,
    },
  }
}

export interface AdminUsersQuery {
  page?: number
  limit?: number
  search?: string
  role?: 'admin' | 'librarian' | 'user'
  verificationStatus?: string[]
}

export async function getAdminUsers(query: AdminUsersQuery = {}) {
  const { payload, user } = await getAdminCtx()

  const andFilters: Where[] = [{ deletedAt: { exists: false } }]

  if (query.role) {
    andFilters.push({ role: { equals: query.role } })
  }

  if (query.verificationStatus?.length) {
    andFilters.push({ verificationStatus: { in: query.verificationStatus } })
  }

  if (query.search) {
    andFilters.push({
      or: [
        { email: { contains: query.search } },
        { fullName: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { phone: { contains: query.search } },
      ],
    })
  }

  const result = await payload.find({
    collection: 'users',
    where: { and: andFilters },
    sort: '-createdAt',
    depth: 0,
    page: query.page || 1,
    limit: query.limit || 20,
    overrideAccess: false,
    user,
  })

  return result
}

export async function softDeleteUser(userId: number) {
  const { payload, user } = await getAdminCtx()

  await payload.update({
    collection: 'users',
    id: userId,
    data: { deletedAt: new Date().toISOString() },
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin-panel/users')
  await writeLog(payload, user, {
    action: LogAction.UserDeleted,
    targetType: 'user',
    targetId: userId,
    message: `حذف عضو #${userId}`,
  })
  return { ok: true }
}

export async function getAdminUser(userId: number | string) {
  const { payload, user } = await getAdminCtx()

  const doc = await payload.findByID({
    collection: 'users',
    id: userId as number,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return doc
}

export async function createAdminUser(input: {
  fullName?: string
  email: string
  password: string
  role: 'admin' | 'librarian'
}): Promise<{ ok: boolean; error?: string; userId?: number }> {
  try {
    const { payload, user } = await getAdminCtx()

    const doc = await payload.create({
      collection: 'users',
      data: {
        fullName: input.fullName || undefined,
        email: input.email,
        password: input.password,
        role: input.role,
        verificationStatus: 'verified',
      },
      overrideAccess: false,
      user,
    })

    revalidatePath('/admin-panel/users')
    await writeLog(payload, user, {
      action: LogAction.UserRoleChanged,
      targetType: 'user',
      targetId: doc.id,
      message: `أنشأ حساباً بدور ${input.role}`,
    })
    return { ok: true, userId: doc.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر إنشاء المستخدم'
    const errorMessage = /duplicate|unique/i.test(message)
      ? 'البريد الإلكتروني مستخدم بالفعل'
      : 'تعذر إنشاء المستخدم'
    return { ok: false, error: errorMessage }
  }
}

export async function updateUserRole(
  userId: number,
  role: 'admin' | 'librarian' | 'user',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { payload, user } = await getAdminCtx()

    await payload.update({
      collection: 'users',
      id: userId,
      data: { role },
      overrideAccess: false,
      user,
    })

    revalidatePath('/admin-panel/users')
    revalidatePath(`/admin-panel/users/${userId}`)
    await writeLog(payload, user, {
      action: LogAction.UserRoleChanged,
      targetType: 'user',
      targetId: userId,
      message: `غيّر دور عضو #${userId} إلى ${role}`,
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر تحديث الدور'
    return { ok: false, error: message }
  }
}
