import { CollectionConfig, Where } from 'payload'
import { isAdmin, isStaff } from '@/utils/access-helpers'

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
  ActivityAttendance: 'activity_attendance',
  ReviewDeleted: 'review_deleted',
  // #156: copying a review onto the same target is an admin write too, and an
  // audit trail that skipped it would be a hole exactly where reviews are
  // curated by hand.
  ReviewCopied: 'review_copied',
  // #156: loan duration and borrow limit are enforced from the Settings global,
  // so changing them changes what every member may do — worth an audit row.
  LoanSettingsUpdated: 'loan_settings_updated',
  LoanApproved: 'loan_approved',
  LoanRefused: 'loan_refused',
  LoanExpired: 'loan_expired',
  LoanRescheduled: 'loan_rescheduled',
  LoanPickedUp: 'loan_picked_up',
  LoanReturned: 'loan_returned',
  LoanCancelled: 'loan_cancelled',
  ExtensionApproved: 'extension_approved',
  ExtensionRefused: 'extension_refused',
  ExtensionWithdrawn: 'extension_withdrawn',
  UserVerified: 'user_verified',
  UserRejected: 'user_rejected',
  UserBlockLifted: 'user_block_lifted',
  UserRoleChanged: 'user_role_changed',
  UserDeleted: 'user_deleted',
  UsersImported: 'users_imported',
  CardIssued: 'card_issued',
  CardStatusChanged: 'card_status_changed',
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
    /**
     * A member reads their own history: rows they acted on, rows the admins
     * wrote about them (`targetType: 'user'` + their id) and rows about loans
     * they hold. Everything else stays private — the stored `message` is the
     * admin's wording and is never rendered to another member (#165).
     *
     * Payload's `Where` has no subqueries, so the loan ids the member may see
     * are resolved here first. `overrideAccess` is left at its default: this
     * is a metadata lookup performed *on behalf of* the rule, not a data read
     * the member is asking for.
     */
    read: async ({ req }) => {
      const { user, payload } = req
      if (!user) return false
      if (isAdmin(user)) return true

      const loans = await payload.find({
        collection: 'loans',
        where: { user: { equals: user.id } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const loanIds = loans.docs.map((loan) => String(loan.id))

      const mine: Where[] = [
        { actor: { equals: user.id } },
        { and: [{ targetType: { equals: 'user' } }, { targetId: { equals: String(user.id) } }] },
      ]
      if (loanIds.length > 0) {
        mine.push({ and: [{ targetType: { equals: 'loan' } }, { targetId: { in: loanIds } }] })
      }
      return { or: mine }
    },
    create: ({ req: { user } }) => isStaff(user),
    // Audit log is append-only: rows are never edited or removed.
    update: () => false,
    delete: () => false,
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
      index: true,
    },
    {
      name: 'targetId',
      type: 'text',
      // Text on purpose: targets span collections of different id types. It is
      // matched against `logs.targetType` in the member read rule (#165).
      index: true,
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
