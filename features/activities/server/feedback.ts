'use server'

import { revalidatePath } from 'next/cache'
import { getPayloadWithUser } from '@/shared/lib/auth'
import type { ActivityFeedback } from '@/payload-types'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { activityEndTime } from '@/utils/constants/activities'

export async function leaveActivityFeedback(
  activityId: number,
  sentiment: 'positive' | 'negative',
  comment?: string,
) {
  const ctx = await getPayloadWithUser()
  if (!ctx) return { ok: false as const, error: 'يجب تسجيل الدخول أولاً' }
  if (!['positive', 'negative'].includes(sentiment))
    return { ok: false as const, error: 'التقييم غير صالح' }
  const { payload, req, user } = ctx
  try {
    const activity = await payload.findByID({
      collection: 'activities',
      id: activityId,
      req,
      overrideAccess: false,
      depth: 0,
    })
    if (activityEndTime(activity) > Date.now())
      return { ok: false as const, error: 'يمكن تقييم النشاط بعد انتهائه فقط' }
    const registered = await payload.count({
      collection: 'activity-registrations',
      where: {
        and: [
          { activity: { equals: activityId } },
          { user: { equals: user.id } },
          { status: { in: ['accepted', 'completed'] } },
        ],
      },
      req,
      overrideAccess: false,
    })
    if (!registered.totalDocs) return { ok: false as const, error: 'التقييم متاح للمسجلين فقط' }
    const existing = await payload.find({
      collection: 'activity-feedback',
      where: { and: [{ activity: { equals: activityId } }, { user: { equals: user.id } }] },
      req,
      overrideAccess: false,
      limit: 1,
      depth: 0,
    })
    const data: Pick<ActivityFeedback, 'sentiment' | 'comment'> = {
      sentiment,
      comment: comment?.trim() || null,
    }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'activity-feedback',
        id: existing.docs[0].id,
        data,
        req,
        overrideAccess: false,
      })
    } else {
      await payload.create({
        collection: 'activity-feedback',
        data: { ...data, activity: activityId, user: user.id },
        req,
        overrideAccess: false,
      })
    }
    revalidatePath(`/user/activities/${activityId}`)
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'تعذر حفظ تقييم النشاط' }
  }
}

export async function getActivityFeedback(activityId: number) {
  const ctx = await getPayloadWithUser()
  const payload = ctx?.payload ?? (await getPayload({ config }))
  const [positive, negative, mine] = await Promise.all([
    payload.count({
      collection: 'activity-feedback',
      where: { and: [{ activity: { equals: activityId } }, { sentiment: { equals: 'positive' } }] },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'activity-feedback',
      where: { and: [{ activity: { equals: activityId } }, { sentiment: { equals: 'negative' } }] },
      overrideAccess: true,
    }),
    ctx
      ? payload.find({
          collection: 'activity-feedback',
          where: { and: [{ activity: { equals: activityId } }, { user: { equals: ctx.user.id } }] },
          req: ctx.req,
          overrideAccess: false,
          limit: 1,
          depth: 0,
        })
      : Promise.resolve({ docs: [] }),
  ])
  return {
    positive: positive.totalDocs,
    negative: negative.totalDocs,
    mine: mine.docs[0] ?? null,
    now: Date.now(),
  }
}
