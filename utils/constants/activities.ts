// ActivityType is shared by this config (collections/Activity.ts field options)
// and the frontend activities feature (features/activities/types.ts).
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
