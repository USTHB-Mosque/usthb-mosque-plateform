import { ActivityType } from '@/interfaces/activities.interfaces'

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
