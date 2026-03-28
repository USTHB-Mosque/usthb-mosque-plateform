import { BaseSearchParams } from './search.interfaces'

export enum ActivityType {
  Aqidah = 'aqidah',
  Fiqh = 'fiqh',
  Hadith = 'hadith',
  Tafsir = 'tafsir',
  Sirah = 'sirah',
  Language = 'language',
  Other = 'other',
}

export interface ActivitySearchParams extends BaseSearchParams {
  types?: ActivityType[]
  openForRegistration?: boolean
}
