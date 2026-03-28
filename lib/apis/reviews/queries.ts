import { useQuery, useInfiniteQuery, InfiniteData } from '@tanstack/react-query'
import { reviewsRequests } from './requests'
import { reviewsKeys } from './keys'
import { PaginatedDocs } from 'payload'
import { Review } from '@/payload-types'

export const useGetReviewsQuery = (bookId: number, page: number = 1) => {
  return useQuery({
    queryKey: reviewsKeys.list(bookId, page),
    queryFn: () => reviewsRequests.getByBookId(bookId, page),
    enabled: !!bookId,
  })
}

export const useGetInfiniteReviewsQuery = (
  bookId: number,
  initialData?: InfiniteData<PaginatedDocs<Review>, number>,
) => {
  return useInfiniteQuery({
    queryKey: ['reviews', 'infinite', bookId],
    queryFn: ({ pageParam = 1 }) => reviewsRequests.getByBookId(bookId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
    enabled: !!bookId,
    initialData,
    // Évite que le focus / refetch remplace tout le cache par la page 1 seule (perte des pages suivantes).
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
