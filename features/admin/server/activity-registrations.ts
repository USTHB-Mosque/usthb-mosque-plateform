'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx, getStaffCtx } from './ctx'
import { isAdmin } from '@/utils/access-helpers'
import { resolveRelationId } from '@/shared/lib/relations'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import { completeFinishedRegistrations } from '@/features/activities'

export async function getAdminActivityRegistrations(activityId: number) {
  const { payload, req, user } = await getStaffCtx()
  await completeFinishedRegistrations({ payload, req, user }, activityId)
  // `limit: 0` is Payload's "all documents" form: registration lists are
  // small, so one whole-collection read is simpler than paging.
  const registrations = await payload.find({
    collection: 'activity-registrations',
    where: { activity: { equals: activityId } },
    sort: '-createdAt',
    limit: 0,
    depth: 1,
    req,
    overrideAccess: false,
  })
  return { registrations: registrations.docs, canDecide: isAdmin(user) }
}

export async function decideActivityRegistration(
  id: number,
  decision: 'accepted' | 'refused',
  reason?: string,
) {
  const { payload, req } = await getAdminCtx()
  if (decision === 'refused' && !reason?.trim()) {
    return { ok: false as const, error: 'سبب الرفض مطلوب' }
  }
  try {
    const registration = await payload.findByID({
      collection: 'activity-registrations',
      id,
      req,
      overrideAccess: false,
      depth: 0,
    })
    if (registration.status !== 'pending')
      return { ok: false as const, error: 'تمت معالجة التسجيل' }
    await payload.update({
      collection: 'activity-registrations',
      id,
      data: { status: decision, refusalReason: decision === 'refused' ? reason!.trim() : null },
      req,
      overrideAccess: false,
    })
    revalidatePath(`/admin-panel/activities/${registration.activity}`)
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'تعذر معالجة التسجيل' }
  }
}

export async function markActivityAttendance(id: number, attended: boolean) {
  const { payload, req, user } = await getAdminCtx()
  try {
    const registration = await payload.findByID({
      collection: 'activity-registrations',
      id,
      req,
      overrideAccess: false,
      depth: 0,
    })
    if (!['accepted', 'completed'].includes(registration.status ?? ''))
      return { ok: false as const, error: 'لا يمكن تسجيل الحضور لهذا التسجيل' }
    await payload.update({
      collection: 'activity-registrations',
      id,
      data: { attended },
      req,
      overrideAccess: false,
    })
    await writeLog(payload, user, {
      action: LogAction.ActivityAttendance,
      targetType: 'activity-registration',
      targetId: id,
      message: attended ? 'سجّل حضور عضو في نشاط' : 'ألغى تسجيل حضور عضو في نشاط',
    })
    revalidatePath(`/admin-panel/activities/${resolveRelationId(registration.activity)}`)
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'تعذر تحديث الحضور' }
  }
}
