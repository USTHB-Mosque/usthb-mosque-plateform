import { BookCategory, BookType } from '@/interfaces/books.interfaces'

export const languagesConfig: Record<string, string> = {
  fr: 'الفرنسية',
  ar: 'العربية',
  en: 'الإنجلزية',
}

export const languagesConfigArray = Object.entries(languagesConfig).map(([value, label]) => {
  return {
    value,
    label,
  }
})

export const bookCategoriesConfig: Record<string, string> = {
  [BookCategory.Religious]: 'دينية',
  [BookCategory.Scientific]: 'علمية',
}

export const bookCategoriesConfigArray = Object.entries(bookCategoriesConfig).map(
  ([value, label]) => {
    return {
      value,
      label,
    }
  },
)

const bookTypesConfig: Record<string, string> = {
  [BookType.Aqidah]: 'عقيدة',
  [BookType.Fiqh]: 'فقه',
  [BookType.Hadith]: 'حديث',
  [BookType.Tafsir]: 'تفسير',
  [BookType.Sirah]: 'سيرة',
  [BookType.QuranicSciences]: 'علوم القرآن',
  [BookType.Dawah]: 'دعوة',
  [BookType.History]: 'تاريخ',
  [BookType.Philosophy]: 'فلسفة',
  [BookType.Mathematics]: 'رياضيات',
  [BookType.Physics]: 'فيزياء',
  [BookType.Chemistry]: 'كيمياء',
  [BookType.Biology]: 'أحياء',
  [BookType.Engineering]: 'هندسة',
  [BookType.Economics]: 'اقتصاد',
  [BookType.Language]: 'لغة',
  [BookType.Other]: 'أخرى',
}

export const bookTypesConfigArray = Object.entries(bookTypesConfig).map(([value, label]) => {
  return {
    value,
    label,
  }
})

export const availabilityConfigArray = [
  {
    value: 'all',
    label: 'الكل',
  },
  {
    value: 'available',
    label: 'متوفر',
  },
  {
    value: 'not-available',
    label: 'غير متوفر',
  },
]
