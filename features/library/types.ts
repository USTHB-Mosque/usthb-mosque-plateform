import { BaseSearchParams } from '@/shared/lib/search.types'
import { BookCategory, BookType } from '@/utils/constants/books'

export { BookCategory, BookType }

export interface BookSearchParams extends BaseSearchParams {
  types?: BookType[]
  authors?: string[]
  languages?: string[]
  availability?: 'available' | 'not-available' | 'all'
  category: BookCategory
}
