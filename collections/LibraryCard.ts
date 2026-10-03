import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import {
  ARCHIVED_CARD_STATUS,
  LIBRARY_CARD_STATUSES,
  type LibraryCardStatus,
} from '@/utils/constants/library-cards'

/**
 * Library cards (#101, finished in #145). Cards are issued automatically when a
 * user is verified (see `utils/library-cards.ts`); the migration backfills the
 * rows for users verified before the feature existed. The admin "add card"
 * action only repairs that automatic issue, so there is exactly one card per
 * member — see `utils/constants/library-cards.ts` for why, and for what each
 * status means.
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
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // On create there is no previous row, so a card born retired is stamped
        // now and a card born in circulation starts with no stamp. On update an
        // omitted `status` means "unchanged", not "clear it" — which is exactly
        // what falling back to the stored status does.
        const previousStatus: LibraryCardStatus | null = originalDoc ? originalDoc.status : null
        const nextStatus = data.status ?? previousStatus

        if (nextStatus !== ARCHIVED_CARD_STATUS) return { ...data, archivedAt: null }

        // Re-archiving must not overwrite the original stamp: the card was
        // retired once, and the date that matters is when it left circulation.
        return {
          ...data,
          archivedAt: originalDoc?.archivedAt ?? new Date().toISOString(),
        }
      },
    ],
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
      required: true,
      defaultValue: 'active',
      index: true,
      options: [...LIBRARY_CARD_STATUSES],
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
        condition: ({ siblingData }) => siblingData?.status === ARCHIVED_CARD_STATUS,
      },
    },
  ],
}
