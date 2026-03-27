import { useQuery } from '@tanstack/react-query'
import { booksRequests } from './requests'
import { booksKeys } from './keys'

export const useBooksQuery = () => {
  return useQuery({
    queryKey: booksKeys.all,
    queryFn: () => booksRequests.getAll(),
  })
}

export const useBookByIdQuery = (id: string) => {
  return useQuery({
    queryKey: booksKeys.detail(id),
    queryFn: () => booksRequests.getById(id),
  })
}
