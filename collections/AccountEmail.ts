import type { CollectionConfig } from 'payload'

export const AccountEmail: CollectionConfig = {
  slug: 'account-emails',
  admin: { hidden: true },
  access: {
    read: ({ req: { user } }) => (user ? { user: { equals: user.id } } : false),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'address', type: 'email', required: true, unique: true },
    { name: 'verifiedAt', type: 'date' },
    { name: 'pendingUntil', type: 'date' },
  ],
}
