import type { TaskConfig } from 'payload'

import { purgeDeletedAccounts } from '@/features/users/server/account-lifecycle'

interface PurgeDeletedAccountsInput {
  now?: string
}

/**
 * Daily sweep that permanently deletes accounts whose 30-day erasure grace
 * window has elapsed. `softDeleteUserAccount` stamps `deletionScheduledFor`
 * when an account is soft-deleted; this is the other half of that promise.
 *
 * Runs on the Payload jobs queue rather than a bespoke cron route so it shares
 * the runner's retry and observability with the rest of the platform.
 */
export const purgeDeletedAccountsTask: TaskConfig<'purgeDeletedAccounts'> = {
  slug: 'purgeDeletedAccounts',
  inputSchema: [
    {
      name: 'now',
      type: 'date',
      admin: {
        description:
          'Override the current time, so the job can be run against a fixed instant in a test.',
      },
    },
  ],
  outputSchema: [
    {
      name: 'purged',
      type: 'number',
    },
  ],
  handler: async ({ req, input }) => {
    const { now } = input as PurgeDeletedAccountsInput
    const purged = await purgeDeletedAccounts(req.payload, now ? new Date(now) : new Date())

    return { output: { purged } }
  },
}
