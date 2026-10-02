// ActivityType is shared by this config (collections/Activity.ts field options)
// and the frontend activities feature (features/activities/types.ts).
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
export enum ActivityType {
  Aqidah = 'aqidah',
  Fiqh = 'fiqh',
  Hadith = 'hadith',
  Tafsir = 'tafsir',
  Sirah = 'sirah',
  Language = 'language',
  Other = 'other',
}

export const activitiesTypesConfig: Record<string, string> = {
  [ActivityType.Aqidah]: 'عقيدة',
  [ActivityType.Fiqh]: 'فقه',
  [ActivityType.Hadith]: 'حديث',
  [ActivityType.Tafsir]: 'تفسير',
  [ActivityType.Sirah]: 'سيرة',
  [ActivityType.Language]: 'لغة',
  [ActivityType.Other]: 'أخرى',
}

export const activitiesTypesConfigArray = Object.entries(activitiesTypesConfig).map(
  ([value, label]) => {
    return {
      value,
      label,
    }
  },
)
