import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import { adminWriteAccess } from '@/utils/access-helpers'
import { CollectionConfig } from 'payload'
import { notifyMembers } from '@/features/notifications/server/audiences'

export const Activity: CollectionConfig = {
  slug: 'activities',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'location'],
  },
  access: {
    read: () => true,
    ...adminWriteAccess(),
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          await notifyMembers(req, {
            type: 'activity',
            title: 'نشاط جديد',
            message: `نُشر النشاط «${doc.title}».`,
            link: `/user/activities/${doc.id}`,
            eventKey: `bulk:activity:${doc.id}`,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: activitiesTypesConfigArray,
      required: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      required: true,
    },
    {
      name: 'longDescription',
      type: 'richText',
      required: true,
    },
    {
      name: 'benefits',
      type: 'array',
      label: 'Benefits / What you will gain',
      required: true,
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'targetAudience',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'supervisor',
      type: 'text',
      label: 'Supervised By (تحت إشراف)',
    },
    {
      name: 'schedules',
      type: 'array',
      label: 'Activity Schedule',
      minRows: 1,
      fields: [
        {
          name: 'dateAndTime',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
              timeIntervals: 15,
              displayFormat: 'd MMMM yyyy HH:mm',
            },
          },
        },
      ],
    },
    {
      name: 'openForRegistration',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'registrationDeadline',
      type: 'date',
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          timeIntervals: 15,
          displayFormat: 'd MMMM yyyy HH:mm',
        },
      },
    },
    {
      name: 'maxParticipants',
      type: 'number',
    },
    {
      name: 'currentParticipants',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
}
