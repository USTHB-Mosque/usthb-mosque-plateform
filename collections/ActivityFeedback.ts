import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { resolveRelationId } from '@/shared/lib/relations'
import { activityEndTime } from '@/features/activities/end-time'

export const ActivityFeedback: CollectionConfig = {
  slug: 'activity-feedback',
  admin: { useAsTitle: 'id' },
  access: {
    read: ({ req: { user } }) =>
      user ? (isAdmin(user) ? true : { user: { equals: user.id } }) : false,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) =>
      user ? (isAdmin(user) ? true : { user: { equals: user.id } }) : false,
    delete: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (!req.user || isAdmin(req.user)) return data
        if (operation === 'update') {
          if (data.user && resolveRelationId(data.user) !== resolveRelationId(originalDoc.user))
            throw new Error('لا يمكن تغيير صاحب التقييم')
          if (
            data.activity &&
            resolveRelationId(data.activity) !== resolveRelationId(originalDoc.activity)
          )
            throw new Error('لا يمكن تغيير النشاط')
        }
        if (operation === 'create') data.user = req.user.id
        const activityId = resolveRelationId(
          operation === 'create' ? data.activity : originalDoc.activity,
        )
        const activity = await req.payload.findByID({
          collection: 'activities',
          id: activityId,
          req,
          overrideAccess: false,
          depth: 0,
        })
        if (activityEndTime(activity) > Date.now())
          throw new Error('لا يمكن تقييم النشاط قبل انتهائه')
        const registrations = await req.payload.count({
          collection: 'activity-registrations',
          where: {
            and: [
              { activity: { equals: activityId } },
              { user: { equals: req.user.id } },
              { status: { in: ['accepted', 'completed'] } },
            ],
          },
          req,
          overrideAccess: false,
        })
        if (!registrations.totalDocs) throw new Error('التقييم متاح للمسجلين فقط')
        return data
      },
    ],
  },
  fields: [
    {
      name: 'activity',
      type: 'relationship',
      relationTo: 'activities',
      required: true,
      index: true,
    },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'sentiment',
      type: 'select',
      required: true,
      options: [
        { label: 'إيجابي', value: 'positive' },
        { label: 'سلبي', value: 'negative' },
      ],
    },
    { name: 'comment', type: 'textarea' },
  ],
}
