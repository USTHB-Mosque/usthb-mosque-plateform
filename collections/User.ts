import { AuthenticationError, Forbidden, ValidationError, type CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { TOKEN_EXPIRATION_SECONDS } from '@/utils/auth-constants'
import { logActivity } from '@/utils/activity-log'
import { ensureLibraryCard } from '@/utils/library-cards'
import { userSituationsConfigArray } from '@/utils/constants/users'
import { notifyAdmins } from '@/features/notifications/server/audiences'
import { createNotification } from '@/features/notifications/server/create-notification'

/**
 * Roles a User self-registers as. Law 18-07 requires a reviewed identity
 * document before a member account exists, so the collection refuses to create
 * one without it.
 *
 * The check is scoped to *external* writes (`payloadAPI` of REST or GraphQL) and
 * to callers who are not an admin. That is precisely the gap this closes: until
 * now the requirement lived only in the `register` server action, so a direct
 * POST to `/api/users` could mint a member with no document. Server-side Local
 * API callers (the `register` action itself, seeds, the first-admin bootstrap)
 * and admin-created staff are unaffected — `register` still validates and
 * attaches the document, and staff have no student ID to supply.
 */
const SELF_REGISTERED_ROLES = ['user']

/** True when the write arrived over HTTP rather than from server-side code. */
function isExternalWrite(req: { payloadAPI?: string }): boolean {
  return req.payloadAPI === 'REST' || req.payloadAPI === 'GraphQL'
}

export const User: CollectionConfig = {
  slug: 'users',
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        // Payload always hands `beforeValidate` the incoming document on create
        // and update; only a delete omits it, and no hook runs for that.
        const incoming = data as NonNullable<typeof data>

        // A member is told *why* a rejection happened, in the bell and in the
        // email, so a decision to reject has to carry the reason with it (#145).
        // This is the one guard on the field-level update that `rejectUser`
        // respects and that an admin editing the status directly in `/admin`
        // cannot bypass — which would otherwise store `rejected` with no
        // explanation at all.
        // Payload merges the stored document into `data` before this hook runs,
        // so both fields already read as the row will look after the change: an
        // edit that never mentions the reason keeps the one already stored.
        if (incoming.verificationStatus === 'rejected' && !incoming.verificationNote?.trim()) {
          throw new ValidationError(
            {
              errors: [{ message: 'سبب الرفض مطلوب', path: 'verificationNote' }],
              req,
            },
            req.t,
          )
        }

        if (operation !== 'create') return incoming

        // An anonymous HTTP signup must supply its own affirmative consent.
        // Only trusted creation paths (bootstrap, seeds, and the server-side
        // registration action, which already checks the consent checkbox) may
        // have it stamped on their behalf.
        if (isExternalWrite(req) && !isAdmin(req.user) && incoming.consentGiven !== true) {
          throw new Forbidden(req.t)
        }

        // Consent is recorded for everyone: the hook stamps the timestamp so
        // admin-created, seeded and bootstrapped accounts carry the same
        // evidence as a member who ticked the box, and so the schema-required
        // `consentGiven` is satisfied on every path.
        if (!incoming.consentGiven) {
          incoming.consentGiven = true
          incoming.consentTimestamp = new Date().toISOString()
        } else if (!incoming.consentTimestamp || (isExternalWrite(req) && !isAdmin(req.user))) {
          incoming.consentTimestamp = new Date().toISOString()
        }

        // Payload applies the field default before collection `beforeValidate`,
        // so `role` is already populated by the time this hook runs.
        const role = String(incoming.role)
        if (
          SELF_REGISTERED_ROLES.includes(role) &&
          !incoming.verificationDocument &&
          isExternalWrite(req) &&
          !isAdmin(req.user)
        ) {
          throw new Forbidden(req.t)
        }

        return data
      },
    ],
    beforeLogin: [
      async ({ req, user }) => {
        // A soft-deleted account must not be able to sign back in during its
        // 30-day grace window; the row survives, the login does not.
        if (user.deletedAt) {
          throw new AuthenticationError(req.t)
        }
        return user
      },
    ],
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        if (operation === 'create') {
          await logActivity(req.payload, doc.id, 'account_created', undefined, req)
          // Admins may create a user that is already verified; mint the card
          // so it is never skipped because no status transition follows.
          if (doc.verificationStatus === 'verified') {
            await ensureLibraryCard(req.payload, doc.id, req)
          }
          if (doc.role === 'user') {
            await notifyAdmins(req, 'activityLogEvents', {
              type: 'system',
              title: 'عضو جديد',
              message: `انضم ${doc.fullName ?? doc.email} إلى المنصة.`,
              link: `/admin-panel/users/${doc.id}`,
            })
            if (doc.verificationStatus === 'pending_verification') {
              await notifyAdmins(req, 'accountRequests', {
                type: 'verification',
                title: 'طلب توثيق جديد',
                message: `ينتظر ${doc.fullName ?? doc.email} توثيق الحساب.`,
                link: '/admin-panel/verification',
              })
            }
          }
        }
        // `previousDoc` is the row as it was before this update, so the
        // verified transition is detected without a nested read that could
        // only ever see the post-update state.
        if (
          operation === 'update' &&
          doc.verificationStatus === 'verified' &&
          previousDoc.verificationStatus !== 'verified'
        ) {
          await logActivity(req.payload, doc.id, 'account_verified', undefined, req)
          await ensureLibraryCard(req.payload, doc.id, req)
        }
        if (
          operation === 'update' &&
          doc.role === 'user' &&
          doc.verificationStatus === 'pending_verification' &&
          previousDoc.verificationStatus !== 'pending_verification'
        ) {
          await notifyAdmins(req, 'accountRequests', {
            type: 'verification',
            title: 'طلب توثيق جديد',
            message: `أعاد ${doc.fullName ?? doc.email} إرسال طلب التوثيق.`,
            link: '/admin-panel/verification',
          })
        }
        if (
          operation === 'update' &&
          doc.verificationStatus !== previousDoc.verificationStatus &&
          (doc.verificationStatus === 'verified' || doc.verificationStatus === 'rejected')
        ) {
          const verified = doc.verificationStatus === 'verified'
          await createNotification({
            req,
            user: doc.id,
            type: 'verification',
            email: true,
            title: verified ? 'تم توثيق الحساب' : 'تم رفض توثيق الحساب',
            // A `rejected` row always carries a note: the guard above refuses
            // the write otherwise, so there is no "no reason given" wording.
            message: verified
              ? 'تم قبول وثيقة التحقق وتوثيق حسابك.'
              : `تم رفض وثيقة التحقق. السبب: ${doc.verificationNote}.`,
            // A rejected member has a document to re-upload; an approved one has
            // a library to open. Sending both to settings was a dead end (#145).
            link: verified ? '/user/library' : '/user/settings',
            emailTemplate: verified
              ? { kind: 'verification-approved' }
              : { kind: 'verification-rejected', reason: doc.verificationNote },
          })
        }
        return doc
      },
    ],
  },
  access: {
    admin: ({ req: { user } }) => isAdmin(user),
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { id: { equals: user.id } }
    },
    delete: ({ req: { user } }) => isAdmin(user),
  },
  auth: {
    tokenExpiration: TOKEN_EXPIRATION_SECONDS,
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000,
    forgotPassword: {
      // Payload's default link points at the admin panel, which non-admin
      // users cannot open; send them to the public reset page instead.
      expiration: 60 * 60 * 1000,
      generateEmailSubject: () => 'إعادة تعيين كلمة المرور',
      generateEmailHTML: (args) => {
        // NEXT_PUBLIC_SERVER_URL is not set in deployed environments, so
        // derive the origin from the request like Payload's own default
        // email does — this keeps preview links working on their per-deploy
        // URLs. The env var wins when it is configured.
        const headers = args?.req?.headers
        const host = headers?.get('x-forwarded-host') ?? headers?.get('host') ?? ''
        const proto = headers?.get('x-forwarded-proto') ?? 'https'
        const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || (host ? `${proto}://${host}` : '')
        const resetURL = `${serverURL}/auth/reset/${args?.token ?? ''}`
        return `
          <div dir="rtl" style="font-family: sans-serif; text-align: right;">
            <h2>إعادة تعيين كلمة المرور</h2>
            <p>تلقينا طلباً لإعادة تعيين كلمة مرور حسابك. الرابط صالح لمدة ساعة واحدة.</p>
            <p>
              <a href="${resetURL}">اضغط هنا لإعادة تعيين كلمة مرورك</a>
            </p>
            <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.</p>
          </div>`
      },
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'verificationStatus', 'cardId', 'situation'],
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
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'faculty',
      type: 'text',
    },
    {
      name: 'speciality',
      type: 'text',
    },
    {
      name: 'studyYear',
      type: 'select',
      options: ['1', '2', '3', '4', '5'],
    },
    {
      // Library-card identity shown in the admin users table (#19).
      name: 'cardId',
      type: 'text',
    },
    {
      name: 'situation',
      type: 'select',
      options: userSituationsConfigArray,
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
      options: ['admin', 'librarian', 'user'],
      saveToJWT: true,
      access: {
        // `role` must be restricted on create as well as update. Without the
        // create guard, an anonymous `POST /api/users` could ask for
        // `role: 'librarian'`, which is outside SELF_REGISTERED_ROLES and so
        // would skip the Verification Document requirement in `beforeValidate`
        // — minting a staff account with no document. Denying the field makes
        // the `user` default apply instead.
        create: ({ req: { user } }) => isAdmin(user),
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'verificationDocument',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'verificationStatus',
      type: 'select',
      defaultValue: 'pending_verification',
      options: ['pending_verification', 'verified', 'rejected'],
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'verificationNote',
      type: 'text',
      admin: {
        condition: ({ siblingData }) => siblingData?.verificationStatus === 'rejected',
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'consentGiven',
      type: 'checkbox',
      // Law 18-07: an account cannot exist without recorded consent. The
      // `beforeValidate` hook stamps the value for paths that do not pass it
      // (admin-created, seeded, bootstrapped), so this requirement holds
      // without breaking them.
      required: true,
      access: {
        update: () => false,
      },
    },
    {
      name: 'consentTimestamp',
      type: 'date',
      admin: {
        readOnly: true,
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'deletionScheduledFor',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: ({ siblingData }) => Boolean(siblingData?.deletedAt),
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    // D2 (#153): a no-show counter and the block it earns. Both live on the
    // user rather than in a history collection — the audit log already records
    // each expiry, and the rule only needs a count plus a flag. A member must
    // never clear either themselves, so both are admin-writable only.
    {
      name: 'noShowCount',
      type: 'number',
      label: 'مرات عدم الاستلام',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'borrowingBlockedAt',
      type: 'date',
      label: 'حظر الاستعارة منذ',
      admin: {
        readOnly: true,
        condition: ({ siblingData }) => Boolean(siblingData?.borrowingBlockedAt),
      },
      access: {
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
    {
      name: 'notificationPreferences',
      type: 'group',
      label: 'Notification Preferences',
      fields: [
        {
          name: 'loanRequests',
          type: 'checkbox',
          defaultValue: true,
          label: 'Loan Requests',
        },
        {
          name: 'activityRegistrations',
          type: 'checkbox',
          defaultValue: true,
          label: 'Activity Registrations',
        },
        {
          name: 'loanExtensions',
          type: 'checkbox',
          defaultValue: true,
          label: 'Loan Extensions',
        },
        {
          name: 'loanReturnReminder',
          type: 'checkbox',
          defaultValue: true,
          label: 'Loan Return Reminder',
        },
        {
          name: 'accountRequests',
          type: 'checkbox',
          defaultValue: true,
          label: 'Account Requests',
        },
        {
          name: 'overdueReturns',
          type: 'checkbox',
          defaultValue: true,
          label: 'Overdue Returns',
        },
        {
          name: 'newReviews',
          type: 'checkbox',
          defaultValue: true,
          label: 'New Reviews',
        },
        {
          name: 'activityLogEvents',
          type: 'checkbox',
          defaultValue: true,
          label: 'Activity Log Events',
        },
        {
          name: 'bulkEmailDigest',
          type: 'checkbox',
          defaultValue: false,
          label: 'Daily Activity and Article Email Digest',
        },
      ],
    },
    {
      name: 'activityLog',
      type: 'array',
      maxRows: 50,
      admin: { disabled: true },
      access: {
        read: ({ req: { user }, doc }) => {
          if (!user) return false
          if (isAdmin(user)) return true
          return user.id === doc?.id
        },
        create: () => false,
        update: () => false,
      },
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          options: [
            { label: 'Login', value: 'login' },
            { label: 'Password Changed', value: 'password_changed' },
            { label: 'Profile Updated', value: 'profile_updated' },
            { label: 'Account Verified', value: 'account_verified' },
            { label: 'Account Created', value: 'account_created' },
            { label: 'First Admin Created', value: 'first_admin_created' },
          ],
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
        {
          name: 'metadata',
          type: 'text',
        },
      ],
    },
  ],
}
