import { CollectionConfig } from 'payload'

export const User: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email'],
  },
  fields: [
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
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
