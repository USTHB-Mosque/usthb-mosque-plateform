import type { JobsConfig } from 'payload'

import { expirePickupWindowsTask } from './pickup-window-task'

/** The queue the Pickup Window sweep is scheduled on and drained from. */
export const PICKUP_WINDOW_QUEUE = 'pickupWindow'

/**
 * The Pickup Window sweep (#153, D1). Every five minutes: the window is
 * measured in hours and a reserved copy sitting past its deadline is a
 * member waiting behind it, so the deadline cannot wait for someone to open
 * the portal. `schedule` only enqueues the task; `autoRun` is what executes
 * it, and both must name the same queue — the same split the erasure sweep
 * uses.
 *
 * Five minutes rather than the erasure job's ten: an erasure a few minutes
 * late is invisible, a book held an extra five minutes is a queue position
 * someone else is missing.
 *
 * Merged into the single `jobs` config in `payload.config.ts`.
 */
export const pickupWindowJobsConfig: JobsConfig = {
  tasks: [
    {
      ...expirePickupWindowsTask,
      schedule: [{ cron: '*/5 * * * *', queue: PICKUP_WINDOW_QUEUE }],
    },
  ],
  autoRun: [
    {
      cron: '*/5 * * * *',
      queue: PICKUP_WINDOW_QUEUE,
      limit: 1,
    },
  ],
}
