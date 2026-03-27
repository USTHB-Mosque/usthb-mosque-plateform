import { BaseSearchParams } from '@/interfaces/apis'
import { httpClient } from '../http-client'
import { PaginatedDocs } from 'payload'
import { Book } from '@/payload-types'

export const booksRequests = {
  getAll: async (params?: BaseSearchParams) => {
    const response = await httpClient.get<PaginatedDocs<Book>>('/books', {
      params,
    })

    return response.data
  },
  getById: async (id: string) => {
    const response = await httpClient.get<Book>(`/books/${id}`)
    return response.data
  },
}
