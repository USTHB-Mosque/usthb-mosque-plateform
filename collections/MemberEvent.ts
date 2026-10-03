import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

/**
 * The member's own half of the activity timeline (#178). One row per action a
 * member performs, written by `afterChange` hooks on the seven source
 * collections through `features/profile/server/member-events.ts` — the same
 * shape `writeLog` gives the administration's side in `logs`.
 *
 * Append-only, and deliberately so: a favorite may be un-favorited and a
 * registration withdrawn, but the record that the member ever made one is
 * history and does not die with the row that caused it. That is the exact
 * lossiness #178 exists to fix.
 *
 * Retention is a deliberate policy, not an accident: rows live as long as the
 * platform does. The table grows by one small row per member action, and the
 * only natural erasure is the owner's own account deletion (the FK cascades,
 * matching the erasure promise for deleted accounts). If a retention window
 * is ever wanted, it must arrive as an explicit job — never as a source row
 * quietly taking the timeline with it.
 */
export const MemberEventAction = {
  LoanRequested: 'loan_requested',
  ExtensionRequested: 'extension_requested',
  WaitlistJoined: 'waitlist_joined',
  RegistrationCreated: 'registration_created',
  BookFavorited: 'book_favorited',
  ArticleFavorited: 'article_favorited',
  ReviewCreated: 'review_created',
} as const

export const memberEventActionOptions = Object.entries(MemberEventAction).map(([key, value]) => ({
  value,
  label: key,
}))

/**
 * The event points at the *content* the action was about — a book, an
 * activity or an article — not at the source row. Titles are resolved at
 * render time from this reference, which is why the reference is stored as
 * plain text: it survives the source row's deletion by design, and a deleted
 * target simply renders with no detail line (#178, open question 2).
 */
export type MemberEventTargetType = 'book' | 'activity' | 'article'

export const MemberEvent: CollectionConfig = {
  slug: 'member-events',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'action', 'targetType', 'targetId', 'timestamp'],
  },
  access: {
    // A member reads their own actions; the administration reads everything.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { user: { equals: user.id } }
    },
    // The hook writer is the only author — `recordMemberEvent` creates with
    // `overrideAccess: true`, the documented system-write bypass. No caller,
    // not even an admin, may fabricate a timeline row.
    create: () => false,
    // Append-only, mirroring `logs`: rows are never edited or removed.
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'المستخدم',
    },
    {
      name: 'action',
      type: 'select',
      options: memberEventActionOptions,
      required: true,
      index: true,
    },
    {
      name: 'targetType',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'targetId',
      type: 'text',
      // Text on purpose, same reasoning as `logs.targetId`: the reference must
      // keep pointing at a target that may already be gone.
      required: true,
      index: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      index: true,
    },
  ],
}
