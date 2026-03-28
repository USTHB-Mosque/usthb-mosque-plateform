import { BaseSearchParams } from './search.interfaces'

export enum ArticleType {
  Aqidah = 'aqidah',
  Fiqh = 'fiqh',
  Hadith = 'hadith',
  Other = 'other',
}

export interface ArticleSearchParams extends BaseSearchParams {
  types?: ArticleType[]
  languages?: string[]
  availability?: 'available' | 'not-available' | 'all'
}
