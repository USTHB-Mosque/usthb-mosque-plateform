import type { JobsConfig, TaskConfig } from 'payload'
import { completeFinishedRegistrations } from './completion'
import { sendActivityReminders } from './reminders'

export const ACTIVITY_COMPLETION_QUEUE = 'activityCompletion'

export const completeActivityRegistrationsTask: TaskConfig<'completeActivityRegistrations'> = {
  slug: 'completeActivityRegistrations',
  inputSchema: [],
  outputSchema: [
    { name: 'completed', type: 'number' },
    { name: 'reminded', type: 'number' },
  ],
  handler: async ({ req }) => {
    const completed = await completeFinishedRegistrations({ payload: req.payload, req })
    const reminded = await sendActivityReminders({ payload: req.payload, req })
    return { output: { completed, reminded } }
  },
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
