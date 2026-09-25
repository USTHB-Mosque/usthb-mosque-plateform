import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

export const LogAction = {
  BookCreated: 'book_created',
  BookUpdated: 'book_updated',
  BookDeleted: 'book_deleted',
  BookImported: 'book_imported',
  ArticleCreated: 'article_created',
  ArticleUpdated: 'article_updated',
  ArticleDeleted: 'article_deleted',
  ActivityCreated: 'activity_created',
  ActivityUpdated: 'activity_updated',
  ActivityDeleted: 'activity_deleted',
  ReviewDeleted: 'review_deleted',
  LoanApproved: 'loan_approved',
  LoanRefused: 'loan_refused',
  LoanPickedUp: 'loan_picked_up',
  LoanReturned: 'loan_returned',
  ExtensionApproved: 'extension_approved',
  ExtensionRefused: 'extension_refused',
  UserVerified: 'user_verified',
  UserRejected: 'user_rejected',
  UserRoleChanged: 'user_role_changed',
  UserDeleted: 'user_deleted',
  UsersImported: 'users_imported',
  CardArchived: 'card_archived',
} as const

export const logActionOptions = Object.entries(LogAction).map(([key, value]) => ({
  value,
  label: key,
}))

/**
 * The application event log (#103). Admin server actions write one row per
 * mutation through `features/admin/server/logs.ts`; the log screen groups them
 * by day and the account-log screen filters on `actor`.
 */
export const Log: CollectionConfig = {
  slug: 'logs',
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['actor', 'action', 'message', 'timestamp'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { actor: { equals: user.id } }
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      // Optional so the row survives the actor's own deletion: the FK is
      // `ON DELETE SET NULL` and audit history must not disappear with an
      // admin account.
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'action',
      type: 'select',
      options: logActionOptions,
      required: true,
      index: true,
    },
    {
      name: 'targetType',
      type: 'text',
    },
    {
      name: 'targetId',
      type: 'text',
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      index: true,
    },
    // Human-readable line composed by the caller, e.g.
    // "أضاف كتاباً: الفوائد لابن القيم (تز/02/16)".
    {
      name: 'message',
      type: 'text',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
}
