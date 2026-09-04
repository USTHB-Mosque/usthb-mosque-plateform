import { useQuery, useInfiniteQuery, InfiniteData } from '@tanstack/react-query'
import { httpClient } from '@/shared/lib/http-client'
import { PaginatedDocs, Where } from 'payload'
import { Review } from '@/payload-types'
import { stringify } from 'qs-esm'

export const reviewsKeys = {
  all: ['reviews'] as const,
  lists: ['reviews', 'list'] as const,
  list: (bookId: number, page?: number) => ['reviews', 'list', { bookId, page }] as const,

  details: () => ['reviews', 'detail'] as const,
  detail: (id: string) => ['reviews', 'detail', id] as const,
}

export async function fetchReviewsByBookId(bookId: number, page: number = 1, limit: number = 40) {
  const query: Where = {
    book: {
      equals: bookId,
    },
  }

  const queryString = stringify(
    {
      where: query,
      page: page,
      limit: limit,
      sort: '-createdAt',
      depth: 1,
    },
    { addQueryPrefix: true, encodeValuesOnly: true },
  )

  return httpClient.get<PaginatedDocs<Review>>(`/reviews${queryString}`)
}

export const useGetReviewsQuery = (bookId: number, page: number = 1) => {
  return useQuery({
    queryKey: reviewsKeys.list(bookId, page),
    queryFn: () => fetchReviewsByBookId(bookId, page),
    enabled: !!bookId,
  })
}

export const useGetInfiniteReviewsQuery = (
  bookId: number,
  initialData?: InfiniteData<PaginatedDocs<Review>, number>,
) => {
  return useInfiniteQuery({
    queryKey: ['reviews', 'infinite', bookId],
    queryFn: ({ pageParam = 1 }) => fetchReviewsByBookId(bookId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
    enabled: !!bookId,
    initialData,
  })
}
