import type { TaskConfig } from 'payload'

import { expirePickupWindows } from './pickup-window'

interface ExpirePickupWindowsInput {
  now?: string
}

/**
 * The scheduled half of the Pickup Window (#153, D1): refuses every accepted
 * Loan whose window has lapsed, releases the copy and moves the no-show
 * counter.
 *
 * On the Payload jobs queue rather than a bespoke cron route, so it shares the
 * runner's retry and observability with the erasure sweep it sits next to. The
 * lazy call on the reads that surface pickup state is the safety net for a
 * process that has not ticked yet — this is what makes the deadline real.
 */
export const expirePickupWindowsTask: TaskConfig<'expirePickupWindows'> = {
  slug: 'expirePickupWindows',
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
      name: 'expired',
      type: 'number',
    },
  ],
  handler: async ({ req, input }) => {
    const { now } = input as ExpirePickupWindowsInput
    const expired = await expirePickupWindows({
      payload: req.payload,
      req,
      ...(now ? { now: new Date(now) } : {}),
    })

    return { output: { expired } }
  },
}
