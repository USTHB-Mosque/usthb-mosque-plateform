'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { getPayloadWithUser } from '@/shared/lib/auth'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'

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

    if (!activityResult) {
      return { success: false, message: 'النشاط غير موجود' }
    }

    if (!activityResult.openForRegistration) {
      return { success: false, message: 'عذراً، التسجيل مغلق لهذا النشاط' }
    }

    if (activityResult.registrationDeadline) {
      const deadline = new Date(activityResult.registrationDeadline)
      if (deadline < new Date()) {
        return { success: false, message: 'انتهى موعد التسجيل لهذا النشاط' }
      }
    }

    if (activityResult.maxParticipants) {
      const currentParticipants = activityResult.currentParticipants || 0
      if (currentParticipants >= activityResult.maxParticipants) {
        return { success: false, message: 'عذراً، اكتمل الحد الأقصى للمشاركين' }
      }
    }

    const existingRegistrationResult = await payload.find({
      collection: 'activity-registrations',
      where: {
        and: [
          { user: { equals: user.id } },
          { activity: { equals: activityId } },
        ],
      },
      req,
      overrideAccess: false,
    })

    if (existingRegistrationResult.docs.length > 0) {
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

    await payload.update({
      collection: 'activities',
      id: activityId,
      data: {
        currentParticipants: (activityResult.currentParticipants || 0) + 1,
      },
      req,
      overrideAccess: false,
    })

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
