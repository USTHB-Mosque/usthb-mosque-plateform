import { BookCategory, BookType } from '@/utils/constants/books'

export const languagesConfig: Record<string, string> = {
  fr: 'الفرنسية',
  ar: 'العربية',
  en: 'الإنجليزية',
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
