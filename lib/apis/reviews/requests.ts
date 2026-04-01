import { httpClient } from '../http-client'
import { PaginatedDocs, Where } from 'payload'
import { Review } from '@/payload-types'
import { stringify } from 'qs-esm'

export const reviewsRequests = {
  getByBookId: async (bookId: number, page: number = 1, limit: number = 40) => {
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
  },
}
