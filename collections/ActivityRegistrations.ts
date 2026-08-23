import { CollectionConfig } from 'payload'

export const ActivityRegistrations: CollectionConfig = {
  slug: 'activity-registrations',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'activity', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
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
