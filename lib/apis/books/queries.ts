import { useQuery } from '@tanstack/react-query'
import { booksRequests } from './requests'
import { booksKeys } from './keys'
import { BookSearchParams } from '@/interfaces/books.interfaces'

export const useGetBooksQuery = (params?: BookSearchParams) => {
  return useQuery({
    queryKey: booksKeys.list(params),
    queryFn: () => booksRequests.getAll(params),
  })
}

export const useGetBookByIdQuery = (id: string) => {
  return useQuery({
    queryKey: booksKeys.detail(id),
    queryFn: () => booksRequests.getById(id),
  })
}
