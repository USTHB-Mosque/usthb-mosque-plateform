'use server'

import { revalidatePath } from 'next/cache'
import { getStaffCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import type { Payload } from 'payload'
import type { Activity, User } from '@/payload-types'

type ActivityFormData = {
  title: string
  type: NonNullable<Activity['type']>
  kind?: Activity['kind']
  shortDescription: string
  longDescription: NonNullable<Activity['longDescription']>
  benefits: NonNullable<Activity['benefits']>
  targetAudience: NonNullable<Activity['targetAudience']>
  location?: string
  supervisor?: string
  schedules: NonNullable<Activity['schedules']>
  openForRegistration?: boolean
  registrationDeadline?: string
  startDate: string
  endDate?: string
  maxParticipants?: number
}

function parseOptionalJsonArray(
  value: string | null,
): Array<{ name?: string; dateAndTime?: string }> {
  if (!value) return []
  const parsed = JSON.parse(value) as Array<{ name?: string; dateAndTime?: string }>
  return Array.isArray(parsed) ? parsed : []
}

function parseActivityFields(formData: FormData): ActivityFormData {
  const title = formData.get('title') as string
  const type = formData.get('type') as string | null
  const kind = formData.get('kind') as Activity['kind']
  const shortDescription = formData.get('shortDescription') as string
  const longDescriptionRaw = formData.get('longDescription') as string | null
  const benefitsRaw = formData.get('benefits') as string | null
  const targetAudienceRaw = formData.get('targetAudience') as string | null
  const schedulesRaw = formData.get('schedules') as string | null
  const location = formData.get('location') as string | null
  const supervisor = formData.get('supervisor') as string | null
  const openForRegistration = formData.get('openForRegistration') === 'true'
  const registrationDeadline = formData.get('registrationDeadline') as string | null
  const startDate = formData.get('startDate') as string | null
  const endDate = formData.get('endDate') as string | null
  const maxParticipants = formData.get('maxParticipants') as string | null

  return {
    title,
    type: type as NonNullable<Activity['type']>,
    kind: kind || 'event',
    shortDescription,
    longDescription: JSON.parse(longDescriptionRaw ?? '') as NonNullable<
      Activity['longDescription']
    >,
    benefits: parseOptionalJsonArray(benefitsRaw) as NonNullable<Activity['benefits']>,
    targetAudience: parseOptionalJsonArray(targetAudienceRaw) as NonNullable<
      Activity['targetAudience']
    >,
    location: location || undefined,
    supervisor: supervisor || undefined,
    schedules: parseOptionalJsonArray(schedulesRaw) as NonNullable<Activity['schedules']>,
    openForRegistration,
    registrationDeadline: registrationDeadline || undefined,
    startDate: startDate ?? '',
    endDate: endDate || undefined,
    maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
  }
}

async function uploadActivityImage(
  payload: Payload,
  imageRaw: FormDataEntryValue | null,
  user: User,
  alt: string,
): Promise<number | undefined> {
  if (!(imageRaw instanceof File) || imageRaw.size === 0) return undefined

  const arrayBuffer = await imageRaw.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mediaDoc = await payload.create({
    collection: 'media',
    data: { alt },
    file: {
      data: buffer,
      mimetype: imageRaw.type,
      name: imageRaw.name,
      size: buffer.byteLength,
    },
    req: { user },
    overrideAccess: false,
  })
  return mediaDoc.id
}

export async function getAdminActivitiesStats() {
  const { payload, user } = await getStaffCtx()

  const now = new Date().toISOString()

  const [total, upcoming, completed, openForRegistration, enrolled, calendar] = await Promise.all([
    payload.count({ collection: 'activities', overrideAccess: false, user }),
    payload.count({
      collection: 'activities',
      where: { startDate: { greater_than_equal: now } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'activities',
      where: {
        or: [
          { endDate: { less_than: now } },
          {
            and: [
              { endDate: { exists: false } },
              { kind: { not_equals: 'ongoing' } },
              { startDate: { less_than: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() } },
            ],
          },
        ],
      },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'activities',
      where: { openForRegistration: { equals: true } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'activity-registrations',
      where: { status: { in: ['pending', 'accepted'] } },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'activities',
      sort: 'startDate',
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ])

  return {
    stats: {
      totalActivities: total.totalDocs,
      upcomingActivities: upcoming.totalDocs,
      completedActivities: completed.totalDocs,
      openForRegistrationActivities: openForRegistration.totalDocs,
      enrolledMembers: enrolled.totalDocs,
    },
    calendarActivities: calendar.docs.map(
      ({ id, title, startDate, type, location, schedules }) => ({
        id,
        title,
        startDate,
        type,
        location,
        schedules,
      }),
    ),
  }
}

export async function createActivity(formData: FormData) {
  const { payload, user } = await getStaffCtx()

  const fields = parseActivityFields(formData)
  if (fields.endDate && new Date(fields.endDate) < new Date(fields.startDate))
    throw new Error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية')
  const imageId = await uploadActivityImage(payload, formData.get('image'), user, fields.title)
  if (!imageId) throw new Error('صورة النشاط مطلوبة')

  const activity = await payload.create({
    collection: 'activities',
    data: {
      ...fields,
      image: imageId,
    },
    req: { user },
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/activities')
  revalidatePath('/activities')
  await writeLog(payload, user, {
    action: LogAction.ActivityCreated,
    targetType: 'activity',
    targetId: activity.id,
    message: `أضاف نشاطاً: ${activity.title}`,
  })
  return { ok: true, activityId: activity.id }
}

export async function updateActivity(activityId: number, formData: FormData) {
  const { payload, user } = await getStaffCtx()

  const fields = parseActivityFields(formData)
  if (fields.endDate && new Date(fields.endDate) < new Date(fields.startDate))
    throw new Error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية')
  const imageId = await uploadActivityImage(payload, formData.get('image'), user, fields.title)

  const activity = await payload.update({
    collection: 'activities',
    id: activityId,
    data: {
      ...fields,
      ...(imageId ? { image: imageId } : {}),
    },
    req: { user },
    overrideAccess: false,
  })

  revalidatePath('/admin-panel/activities')
  revalidatePath(`/admin-panel/activities/${activityId}`)
  await writeLog(payload, user, {
    action: LogAction.ActivityUpdated,
    targetType: 'activity',
    targetId: activityId,
    message: `عدّل نشاطاً: ${activity.title}`,
  })
  return { ok: true, activityId: activity.id }
}

export async function getAdminActivity(activityId: number | string) {
  const { payload, user } = await getStaffCtx()

  const doc = await payload.findByID({
    collection: 'activities',
    id: activityId as number,
    depth: 2,
    overrideAccess: false,
    user,
  })

  return doc
}

export async function deleteActivity(activityId: number) {
  const { payload, user } = await getStaffCtx()

  let activity
  try {
    activity = await payload.findByID({
      collection: 'activities',
      id: activityId,
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false as const, error: 'تعذر حذف النشاط، حاول مرة أخرى.' }
  }

  try {
    await payload.delete({
      collection: 'activities',
      id: activityId,
      overrideAccess: false,
      user,
    })
  } catch {
    return { ok: false as const, error: 'تعذر حذف النشاط، حاول مرة أخرى.' }
  }

  revalidatePath('/admin-panel/activities')
  await writeLog(payload, user, {
    action: LogAction.ActivityDeleted,
    targetType: 'activity',
    targetId: activityId,
    message: `حذف نشاط: ${activity.title}`,
  })
  return { ok: true as const }
}

export async function bulkDeleteActivities(activityIds: number[]) {
  if (activityIds.length === 0) return { ok: true as const, count: 0 }

  const { payload, user } = await getStaffCtx()

  const result = await payload.delete({
    collection: 'activities',
    where: { id: { in: activityIds } },
    overrideAccess: false,
    user,
  })

  revalidatePath('/admin-panel/activities')
  await writeLog(payload, user, {
    action: LogAction.ActivityDeleted,
    targetType: 'activity',
    message: `حذف ${result.docs.length} نشاطاً`,
  })
  return { ok: result.errors.length === 0, count: result.docs.length }
}
