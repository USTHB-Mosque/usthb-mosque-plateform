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
      options: [
        { label: 'Atelier', value: 'workshop' },
        { label: 'Conférence', value: 'conference' },
        { label: 'Club de lecture', value: 'reading_club' },
        { label: 'Autre', value: 'other' },
      ],
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
      fields: [
        {
          name: 'benefit',
          type: 'text',
        },
      ],
    },
    {
      name: 'targetAudience',
      type: 'text',
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
          type: 'date',
          name: 'dateAndTime',
          required: true,
        },
      ],
    },
    {
      name: 'registration',
      type: 'group',
      label: 'إعدادات التسجيل',
      fields: [
        {
          name: 'isOpen',
          type: 'checkbox',
          defaultValue: false,
          label: 'فتح باب التسجيل',
        },
        {
          name: 'maxParticipants',
          type: 'number',
          label: 'العدد الأقصى للمشاركين',
        },
        {
          name: 'currentParticipants',
          type: 'number',
          defaultValue: 0,
          admin: { readOnly: true },
        },
      ],
    },
  ],
}
