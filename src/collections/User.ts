import { CollectionConfig } from 'payload'

export const User: CollectionConfig = {
  slug: 'users',
  auth: true,
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
      type: 'text',
    },
  ],
}
