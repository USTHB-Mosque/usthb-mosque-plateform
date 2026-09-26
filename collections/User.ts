import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import { TOKEN_EXPIRATION_SECONDS } from '@/utils/auth-constants'
import { logActivity } from '@/utils/activity-log'
import { ensureLibraryCard } from '@/utils/library-cards'
import { userSituationsConfigArray } from '@/utils/constants/users'

export const User: CollectionConfig = {
  slug: 'users',
  hooks: {
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        if (operation === 'create') {
          await logActivity(req.payload, doc.id, 'account_created', undefined, req)
          // Admins may create a user that is already verified; mint the card
          // so it is never skipped because no status transition follows.
          if (doc.verificationStatus === 'verified') {
            await ensureLibraryCard(req.payload, doc.id, req)
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
      defaultValue: false,
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
