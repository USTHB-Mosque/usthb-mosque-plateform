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
