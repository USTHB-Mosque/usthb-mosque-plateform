import { BaseSearchParams } from '@/interfaces/apis.interfaces'
import { httpClient } from '../http-client'
import { PaginatedDocs } from 'payload'
import { Article } from '@/payload-types'

export const articlesRequests = {
  getAll: async (params?: BaseSearchParams) => {
    const response = await httpClient.get<PaginatedDocs<Article>>('/articles', {
      params,
    })

    return response.data
  },
  getById: async (id: string) => {
    const response = await httpClient.get<Article>(`/articles/${id}`)
    return response.data
  },
}
