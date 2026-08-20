import { BookCategory, BookType } from '@/interfaces/books.interfaces'

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

const bookReligiousQuickTypes: Record<string, string> = {
  [BookType.Aqidah]: 'عقيدة',
  [BookType.Fiqh]: 'فقه',
  [BookType.Hadith]: 'حديث',
  [BookType.Tafsir]: 'تفسير',
  [BookType.Sirah]: 'سيرة',
  [BookType.Dawah]: 'دعوة',
}

const bookScientificQuickTypes: Record<string, string> = {
  [BookType.Mathematics]: 'رياضيات',
  [BookType.Physics]: 'فيزياء',
  [BookType.Chemistry]: 'كيمياء',
  [BookType.Biology]: 'أحياء',
  [BookType.Engineering]: 'هندسة',
  [BookType.Economics]: 'اقتصاد',
}

export const bookQuickTypesConfigArray: Record<BookCategory, { value: string; label: string }[]> = {
  [BookCategory.Religious]: Object.entries(bookReligiousQuickTypes).map(([value, label]) => ({
    value,
    label,
  })),
  [BookCategory.Scientific]: Object.entries(bookScientificQuickTypes).map(([value, label]) => ({
    value,
    label,
  })),
}

const bookAuthors = [
  'الشيخ محمد بن صالح العثيمين',
  'الشيخ عبد العزيز بن عبد الله بن باز',
  'الشيخ محمد ناصر الدين الألباني',
  'الشيخ محمد بن إبراهيم آل الشيخ',
  'الشيخ عبد الرحمن بن ناصر السعدي',
  'الشيخ محمد بن صالح المنجد',
]

export const bookAuthorsConfigArray = bookAuthors.map((author) => ({
  value: author,
  label: author,
}))
