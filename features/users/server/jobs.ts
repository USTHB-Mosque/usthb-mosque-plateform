import type { JobsConfig } from 'payload'

import { purgeDeletedAccountsTask } from '@/features/users/server/purge-job'

/** The queue the erasure sweep is scheduled on and drained from. */
export const ERASURE_QUEUE = 'erasure'

/**
 * The daily sweep that fulfils the right to erasure. `schedule` only enqueues
 * the task; `autoRun` is what actually executes it, and both must name the same
 * queue.
 *
 * Runs daily rather than hourly because a deletion that runs a few hours late
 * is not a compliance failure, and the sweep is a single indexed query.
 */
export const erasureJobsConfig: JobsConfig = {
  tasks: [
    {
      ...purgeDeletedAccountsTask,
      schedule: [{ cron: '17 3 * * *', queue: ERASURE_QUEUE }],
    },
  ],
  autoRun: [
    {
      cron: '*/10 * * * *',
      queue: ERASURE_QUEUE,
      limit: 1,
    },
  ],
}
