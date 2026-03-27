import { BaseSearchParams } from '@/interfaces/apis'
import { httpClient } from '../http-client'

export const booksRequests = {
  getAll: async (params?: BaseSearchParams) => {
    const response = await httpClient.get('/books', {
      params,
    })

    return response.data
  },
  getById: async (id: string) => {
    const response = await httpClient.get(`/books/${id}`)
    return response.data
  },
}
