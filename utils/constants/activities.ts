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

export type ActivityLifecycle = { label: string; className: string }

/**
 * The three words an activity's own schedule earns it — قادم, قائم, مكتمل —
 * with the bed each one is painted on.
 *
 * It lived inline in the admin activities table, which meant the admin grid
 * and any other surface asking the same question had to re-derive it and could
 * answer differently (#65). It sits here beside `activityEndTime`, because it is
 * the same derivation: the clock, read against the stored dates.
 *
 * `openForRegistration` outranks the clock. An activity still taking
 * registrations is قائم however far past its start it has run, because that is
 * the state a member can act on — the one thing a reader needs to know first.
 */
export function activityLifecycleStatus(
  activity: Pick<Activity, 'startDate' | 'endDate' | 'schedules' | 'kind' | 'openForRegistration'>,
): ActivityLifecycle {
  if (activityEndTime(activity) < Date.now())
    return { label: 'مكتمل', className: 'bg-muted text-muted-foreground rounded-lg' }
  if (activity.openForRegistration)
    return { label: 'قائم', className: 'bg-[#00FF92] text-[#243245] rounded-lg' }
  const started = activity.startDate ? new Date(activity.startDate).getTime() < Date.now() : false
  if (started)
    return {
      label: 'قائم',
      className: 'bg-[#0DEAC2]/10 text-[#0AAFC2] dark:text-[#4dedff] rounded-lg',
    }
  return {
    label: 'قادم',
    className: 'bg-[#0DEAC2]/10 text-[#0AAFC2] dark:text-[#4dedff] rounded-lg',
  }
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
