import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { resolveRelationId } from '@/shared/lib/relations'
import { createNotification } from '@/features/notifications/server/create-notification'

export const ActivityRegistrations: CollectionConfig = {
  slug: 'activity-registrations',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'activity', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc, context }) => {
        if (operation === 'create' && req.user && !isAdmin(req.user)) {
          data.user = req.user.id
          data.status = 'pending'
          data.attended = false
          data.refusalReason = null
          const activityId = resolveRelationId(data.activity)
          const activity = await req.payload.findByID({
            collection: 'activities',
            id: activityId,
            req,
            overrideAccess: true,
            depth: 0,
          })
          if (
            !activity.openForRegistration ||
            (activity.registrationDeadline && new Date(activity.registrationDeadline) < new Date())
          ) {
            throw new Error('التسجيل مغلق لهذا النشاط')
          }
          const previous = await req.payload.count({
            collection: 'activity-registrations',
            where: {
              and: [{ user: { equals: req.user.id } }, { activity: { equals: activityId } }],
            },
            req,
            overrideAccess: true,
          })
          if (previous.totalDocs) throw new Error('لديك بالفعل تسجيل في هذا النشاط')
          const max = activity.maxParticipants
          const current = activity.currentParticipants ?? 0
          if (max != null && current >= max) {
            data.status = 'quota_rejected'
          }
        }
        // Transition guards fire only when an actor is attached: admins may
        // decide pending rows (reason mandatory for refusals) and members may
        // retry a quota rejection, while seed/administrative writes with no
        // user pass through untouched.
        if (
          operation === 'update' &&
          req.user &&
          data.status &&
          data.status !== originalDoc?.status
        ) {
          if (
            originalDoc?.status === 'quota_rejected' &&
            data.status === 'pending' &&
            context?.retryQuota
          ) {
            const activity = await req.payload.findByID({
              collection: 'activities',
              id: resolveRelationId(originalDoc.activity),
              req,
              overrideAccess: true,
              depth: 0,
            })
            if (
              originalDoc.user !== req.user.id ||
              !activity.openForRegistration ||
              (activity.registrationDeadline &&
                new Date(activity.registrationDeadline) < new Date()) ||
              (activity.maxParticipants &&
                (activity.currentParticipants ?? 0) >= activity.maxParticipants)
            ) {
              throw new Error('لا يمكن إعادة التسجيل')
            }
            return data
          }
          if (originalDoc?.status !== 'pending' || !['accepted', 'refused'].includes(data.status)) {
            throw new Error('لا يمكن تغيير قرار التسجيل')
          }
          if (data.status === 'refused' && !String(data.refusalReason ?? '').trim()) {
            throw new Error('سبب الرفض مطلوب')
          }
          if (data.status === 'refused') data.refusalReason = String(data.refusalReason).trim()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const activityId = resolveRelationId(doc.activity)
        const counterChanged =
          (operation === 'create' && doc.status === 'pending') ||
          (operation === 'update' &&
            ((previousDoc?.status === 'pending' && doc.status === 'refused') ||
              (previousDoc?.status === 'quota_rejected' && doc.status === 'pending')))
        const resolved =
          (operation === 'create' && doc.status === 'quota_rejected') ||
          (operation === 'update' &&
            doc.status !== previousDoc?.status &&
            (doc.status === 'accepted' || doc.status === 'refused'))
        if (!counterChanged && !resolved) return doc

        // One read serves both the counter write-back and the notice.
        const activity = await req.payload.findByID({
          collection: 'activities',
          id: activityId,
          req,
          overrideAccess: true,
          depth: 0,
        })
        if (counterChanged) {
          await req.payload.update({
            collection: 'activities',
            id: activityId,
            data: {
              currentParticipants: Math.max(
                0,
                (activity.currentParticipants ?? 0) + (doc.status === 'pending' ? 1 : -1),
              ),
            },
            req,
            overrideAccess: true,
          })
        }
        if (resolved) {
          const accepted = doc.status === 'accepted'
          const quota = doc.status === 'quota_rejected'
          await createNotification({
            req,
            user: resolveRelationId(doc.user),
            type: 'activity',
            title: accepted
              ? 'تم قبول التسجيل في النشاط'
              : quota
                ? 'اكتمل عدد المشاركين'
                : 'تم رفض التسجيل في النشاط',
            message: accepted
              ? `تم قبول تسجيلك في «${activity.title}».`
              : quota
                ? `اكتمل عدد المشاركين في «${activity.title}».`
                : `تم رفض تسجيلك في «${activity.title}». السبب: ${doc.refusalReason}.`,
            link: '/user/my-registrations',
            email: !quota,
          })
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        if (doc.status === 'pending' || doc.status === 'accepted') {
          const activityId = resolveRelationId(doc.activity)
          const activity = await req.payload.findByID({
            collection: 'activities',
            id: activityId,
            req,
            overrideAccess: true,
            depth: 0,
          })
          await req.payload.update({
            collection: 'activities',
            id: activityId,
            data: { currentParticipants: Math.max(0, (activity.currentParticipants ?? 0) - 1) },
            req,
            overrideAccess: true,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      label: 'المستخدم',
    },
    {
      name: 'activity',
      type: 'relationship',
      relationTo: 'activities',
      required: true,
      hasMany: false,
      label: 'النشاط',
    },
    {
      name: 'attended',
      type: 'checkbox',
      defaultValue: false,
      label: 'تم الحضور',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'قيد المراجعة', value: 'pending' },
        { label: 'مقبول', value: 'accepted' },
        { label: 'مرفوض', value: 'refused' },
        { label: 'اكتمل العدد', value: 'quota_rejected' },
      ],
    },
    { name: 'refusalReason', type: 'text' },
  ],
}
