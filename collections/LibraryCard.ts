import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

/**
 * Library cards (#101). Cards are issued automatically when a user is
 * verified (see `utils/library-cards.ts`); the migration backfills the rows
 * for users verified before the feature existed.
 */
export const LibraryCard: CollectionConfig = {
  slug: 'library-cards',
  admin: {
    useAsTitle: 'cardId',
    defaultColumns: ['cardId', 'user', 'status', 'issueDate'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      name: 'cardId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'فعالة', value: 'active' },
        { label: 'مأرشفة', value: 'archived' },
      ],
    },
    {
      name: 'issueDate',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
    },
    {
      name: 'archivedAt',
      type: 'date',
      admin: {
        condition: ({ siblingData }) => siblingData?.status === 'archived',
      },
    },
  ],
}
