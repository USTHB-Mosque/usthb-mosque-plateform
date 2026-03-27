import { BaseSearchParams } from './search.interfaces'

export enum BookCategory {
  Religious = 'religious',
  Scientific = 'scientific',
}

export enum BookType {
  Aqidah = 'aqidah',
  Fiqh = 'fiqh',
  Hadith = 'hadith',
  Tafsir = 'tafsir',
  Sirah = 'sirah',
  QuranicSciences = 'quranic-sciences',
  Dawah = 'dawah',
  History = 'history',
  Philosophy = 'philosophy',
  Mathematics = 'mathematics',
  Physics = 'physics',
  Chemistry = 'chemistry',
  Biology = 'biology',
  Engineering = 'engineering',
  Economics = 'economics',
  Language = 'language',
  Other = 'other',
}

export interface BookSearchParams extends BaseSearchParams {
  types?: BookType[]
  languages?: string[]
  availability?: 'available' | 'not-available' | 'all'
  category: BookCategory
}
