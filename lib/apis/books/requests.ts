import { httpClient } from '../http-client'
import { PaginatedDocs, Where } from 'payload'
import { Book } from '@/payload-types'
import { BookSearchParams } from '@/interfaces/books.interfaces'
import { stringify } from 'qs-esm'

export const booksRequests = {
  getAll: async (params?: BookSearchParams) => {
    const andFilters: Where[] = []

    if (params?.category) {
      andFilters.push({ category: { equals: params.category } })
    }

    if (params?.types) {
      andFilters.push({ type: { in: params.types } })
    }

    if (params?.languages) {
      andFilters.push({ language: { in: params.languages } })
    }

    if (params?.availability === 'available') {
      andFilters.push({ availableBooks: { greater_than: 0 } })
    } else if (params?.availability === 'not-available') {
      andFilters.push({ availableBooks: { equals: 0 } })
    }

    if (params?.search) {
      andFilters.push({
        or: [
          { title: { contains: params.search } },
          { shortDescription: { contains: params.search } },
          { author: { contains: params.search } },
          { publisher: { contains: params.search } },
        ],
      })
    }

    const query: Where = andFilters.length > 0 ? { and: andFilters } : {}

    const queryString = stringify(
      {
        where: query,
        page: params?.page || 1,
        limit: params?.limit || 10,
        sort: '-createdAt',
      },
      { addQueryPrefix: true, encodeValuesOnly: true },
    )
    const response = await httpClient.get<PaginatedDocs<Book>>(`/books${queryString}`)

    return response.data
  },
  getById: async (id: string) => {
    const response = await httpClient.get<Book>(`/books/${id}`)
    return response.data
  },
}
