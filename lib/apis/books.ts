import { useQuery } from '@tanstack/react-query'
import { httpClient } from './http-client'
import { buildQuery } from './build-query'
import { PaginatedDocs, Where } from 'payload'
import { Book } from '@/payload-types'
import { BookSearchParams } from '@/interfaces/books.interfaces'
import { stringify } from 'qs-esm'

export const booksKeys = {
  list: (params?: BookSearchParams) => ['books', 'list', params] as const,
  detail: (id: string) => ['books', 'detail', id] as const,
}

function buildBookQuery(params?: BookSearchParams): Where {
  return buildQuery({
    category: params?.category,
    type: params?.types?.length ? undefined : undefined,
    author: params?.authors?.length ? undefined : undefined,
    language: params?.languages,
  })
}

export async function fetchBooks(params?: BookSearchParams) {
  const andFilters: Where[] = []

  if (params?.category) {
    andFilters.push({ category: { equals: params.category } })
  }

  if (params?.types?.length) {
    andFilters.push({ type: { in: params.types } })
  }

  if (params?.authors?.length) {
    andFilters.push({ author: { in: params.authors } })
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
  return httpClient.get<PaginatedDocs<Book>>(`/books${queryString}`)
}

export async function fetchBookById(id: string) {
  return httpClient.get<Book>(`/books/${id}`)
}

export function useGetBooksQuery(params?: BookSearchParams) {
  return useQuery({
    queryKey: booksKeys.list(params),
    queryFn: () => fetchBooks(params),
  })
}

export function useGetBookByIdQuery(id: string) {
  return useQuery({
    queryKey: booksKeys.detail(id),
    queryFn: () => fetchBookById(id),
  })
}
