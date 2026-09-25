'use server'

import { revalidatePath } from 'next/cache'
import { getStaffCtx } from './ctx'
import type { Payload } from 'payload'
import type { Activity, User } from '@/payload-types'

type ActivityFormData = {
  title: string
  type: NonNullable<Activity['type']>
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
  const maxParticipants = formData.get('maxParticipants') as string | null

  return {
    title,
    type: type as NonNullable<Activity['type']>,
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

  const [total, upcoming, completed, openForRegistration] = await Promise.all([
    payload.count({ collection: 'activities', overrideAccess: false, user }),
    payload.count({
      collection: 'activities',
      where: { startDate: { greater_than_equal: now } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'activities',
      where: { startDate: { less_than: now } },
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'activities',
      where: { openForRegistration: { equals: true } },
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
    },
  }
}

export async function createActivity(formData: FormData) {
  const { payload, user } = await getStaffCtx()

  const fields = parseActivityFields(formData)
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
  return { ok: true, activityId: activity.id }
}

export async function updateActivity(activityId: number, formData: FormData) {
  const { payload, user } = await getStaffCtx()

  const fields = parseActivityFields(formData)
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
  return { ok: result.errors.length === 0, count: result.docs.length }
}
