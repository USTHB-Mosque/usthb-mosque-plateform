import type { JobsConfig, TaskConfig } from 'payload'
import { completeFinishedRegistrations } from './completion'

export const ACTIVITY_COMPLETION_QUEUE = 'activityCompletion'

export const completeActivityRegistrationsTask: TaskConfig<'completeActivityRegistrations'> = {
  slug: 'completeActivityRegistrations',
  inputSchema: [],
  outputSchema: [{ name: 'completed', type: 'number' }],
  handler: async ({ req }) => ({
    output: { completed: await completeFinishedRegistrations({ payload: req.payload, req }) },
  }),
}

export const activityCompletionJobsConfig: JobsConfig = {
  tasks: [
    {
      ...completeActivityRegistrationsTask,
      schedule: [{ cron: '0 * * * *', queue: ACTIVITY_COMPLETION_QUEUE }],
    },
  ],
  autoRun: [{ cron: '0 * * * *', queue: ACTIVITY_COMPLETION_QUEUE, limit: 1 }],
}
