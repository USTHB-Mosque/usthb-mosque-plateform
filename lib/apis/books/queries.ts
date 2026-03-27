import { useQuery } from '@tanstack/react-query'
import { booksRequests } from './requests'
import { booksKeys } from './keys'
import { BaseSearchParams } from '@/interfaces/apis'

export const useBooksQuery = (params?: BaseSearchParams) => {
  return useQuery({
    queryKey: booksKeys.all,
    queryFn: () => booksRequests.getAll(params),
  })
}

export const useBookByIdQuery = (id: string) => {
  return useQuery({
    queryKey: booksKeys.detail(id),
    queryFn: () => booksRequests.getById(id),
  })
}
