import { BookSearchParams } from '@/interfaces/books.interfaces'

export const booksKeys = {
  all: ['books'] as const,
  lists: ['books', 'list'] as const,
  list: (params?: BookSearchParams) => ['books', 'list', params] as const,

  details: () => ['books', 'detail'] as const,
  detail: (id: string) => ['books', 'detail', id] as const,
}
