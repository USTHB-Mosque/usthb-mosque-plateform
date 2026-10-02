'use server'
import { getPayloadWithUser } from '@/shared/lib/auth'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { revalidatePath } from 'next/cache'
import { resolveRelationId } from '@/shared/lib/relations'
import { activityEndTime } from '@/utils/constants/activities'

interface RegisterActivityResult {
  success: boolean
  message: string
  registration?: unknown
}

export async function registerActivityLogic(
  activityId: string,
  ctx: { payload: Payload; user: User; req: PayloadRequest },
): Promise<RegisterActivityResult> {
  const { payload, user, req } = ctx

  try {
    const activityResult = await payload.findByID({
      collection: 'activities',
      id: activityId,
      req,
      overrideAccess: false,
    })

    // payload.findByID throws for a missing activity, so activityResult is
    // always set here.
    if (!activityResult.openForRegistration) {
      return { success: false, message: 'عذراً، التسجيل مغلق لهذا النشاط' }
    }
    if (
      (activityResult.kind !== 'ongoing' &&
        new Date(activityResult.startDate).getTime() <= Date.now()) ||
      activityEndTime(activityResult) <= Date.now()
    )
      return { success: false, message: 'بدأ النشاط، انتهى التسجيل' }

    if (activityResult.registrationDeadline) {
      const deadline = new Date(activityResult.registrationDeadline)
      if (deadline < new Date()) {
        return { success: false, message: 'انتهى موعد التسجيل لهذا النشاط' }
      }
    }

    const existingRegistrationResult = await payload.find({
      collection: 'activity-registrations',
      where: {
        and: [{ user: { equals: user.id } }, { activity: { equals: activityId } }],
      },
      req,
      overrideAccess: false,
    })

    const previous = existingRegistrationResult.docs[0]
    if (previous?.status === 'quota_rejected' || previous?.status === 'cancelled') {
      const max = activityResult.maxParticipants
      const current = activityResult.currentParticipants ?? 0
      if (max != null && current >= max) {
        return {
          success: false,
          message: 'عذراً، اكتمل الحد الأقصى للمشاركين',
          registration: previous,
        }
      }
      const registration = await payload.update({
        collection: 'activity-registrations',
        id: previous.id,
        data: { status: 'pending' },
        req,
        overrideAccess: true,
        context: { retryQuota: true },
      })
      return { success: true, message: 'تم التسجيل في النشاط بنجاح', registration }
    }
    if (previous) {
      return { success: false, message: 'لديك بالفعل تسجيل في هذا النشاط' }
    }

    const registration = await payload.create({
      collection: 'activity-registrations',
      data: {
        user: user.id,
        activity: parseInt(activityId),
        attended: false,
      },
      req,
      overrideAccess: false,
    })

    if (registration.status === 'quota_rejected') {
      return { success: false, message: 'عذراً، اكتمل الحد الأقصى للمشاركين', registration }
    }
    return { success: true, message: 'تم التسجيل في النشاط بنجاح', registration }
  } catch (error) {
    console.error('Error registering for activity:', error)
    return { success: false, message: 'حدث خطأ أثناء التسجيل في النشاط' }
  }
}

export const registerActivity = async (activityId: string): Promise<RegisterActivityResult> => {
  const ctx = await getPayloadWithUser()

  if (!ctx) {
    return { success: false, message: 'يجب تسجيل الدخول أولاً' }
  }

  return registerActivityLogic(activityId, ctx)
}

export async function getUserActivityRegistration(activityId: string) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { registered: false }

  const existing = await ctx.payload.find({
    collection: 'activity-registrations',
    where: {
      and: [{ user: { equals: ctx.user.id } }, { activity: { equals: activityId } }],
    },
    limit: 1,
    req: ctx.req,
    overrideAccess: false,
  })

  return {
    registered: existing.docs.some(
      (row) => !['quota_rejected', 'cancelled', 'refused'].includes(row.status ?? ''),
    ),
  }
}

export async function cancelActivityRegistration(id: number) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'يجب تسجيل الدخول أولاً' }
  const { payload, user, req } = ctx
  try {
    const row = await payload.findByID({
      collection: 'activity-registrations',
      id,
      req,
      overrideAccess: false,
      depth: 0,
    })
    if (
      resolveRelationId(row.user) !== user.id ||
      !['pending', 'accepted'].includes(row.status ?? '')
    )
      return { ok: false as const, error: 'لا يمكن إلغاء هذا التسجيل' }
    const activity = await payload.findByID({
      collection: 'activities',
      id: resolveRelationId(row.activity),
      req,
      overrideAccess: false,
      depth: 0,
    })
    if (new Date(activity.startDate).getTime() <= Date.now())
      return { ok: false as const, error: 'بدأ النشاط، لا يمكن إلغاء التسجيل' }
    await payload.update({
      collection: 'activity-registrations',
      id,
      data: { status: 'cancelled' },
      req,
      overrideAccess: true,
      context: { cancelRegistration: true },
    })
    revalidatePath('/user/my-registrations')
    revalidatePath(`/user/activities/${activity.id}`)
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'تعذر إلغاء التسجيل' }
  }
}
