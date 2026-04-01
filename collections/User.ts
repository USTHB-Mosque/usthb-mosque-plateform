import { CollectionConfig } from 'payload'

export const User: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
  },
  auth: {
    tokenExpiration: 7200,
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000,
    disableLocalStrategy: true,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'fullName',
      type: 'text',
    },
    {
      name: 'sub',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
      index: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: ['admin', 'user'],
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => Boolean(user?.role === 'admin'),
      },
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'password',
      type: 'text',
      required: false,
    },
  ],
}
