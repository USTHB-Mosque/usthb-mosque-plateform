import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import { CollectionConfig } from 'payload'

export const Activity: CollectionConfig = {
  slug: 'activities',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'location'],
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
