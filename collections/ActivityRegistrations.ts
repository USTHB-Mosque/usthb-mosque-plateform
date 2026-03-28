import { CollectionConfig } from 'payload'

export const ActivityRegistrations: CollectionConfig = {
  slug: 'activity-registrations',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'activity', 'createdAt'],
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
  ],
}
