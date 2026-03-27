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
  Logic = 'logic',
  Mathematics = 'mathematics',
  Physics = 'physics',
  Chemistry = 'chemistry',
  Biology = 'biology',
  Engineering = 'engineering',
  Medicine = 'medicine',
  Economics = 'economics',
  Politics = 'politics',
  Sociology = 'sociology',
  Psychology = 'psychology',
  Language = 'language',
  Literature = 'literature',
  Arts = 'arts',
  Other = 'other',
}

export interface BookSearchParams extends BaseSearchParams {
  type?: BookType
  language?: string
  available?: boolean
  category: BookCategory
}
