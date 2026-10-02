import type { Activity } from '@/payload-types'

/** Legacy events without an end date get a two-hour window after their last session. */
export function activityEndTime(
  activity: Pick<Activity, 'startDate' | 'endDate' | 'schedules' | 'kind'>,
): number {
  if (activity.endDate) return new Date(activity.endDate).getTime()
  if (activity.kind === 'ongoing') return Number.POSITIVE_INFINITY
  return (
    Math.max(
      new Date(activity.startDate).getTime(),
      ...(activity.schedules ?? []).map((schedule) => new Date(schedule.dateAndTime).getTime()),
    ) +
    2 * 60 * 60 * 1000
  )
}
