import { httpClient } from '../http-client'
import { PaginatedDocs, Where } from 'payload'
import { Article } from '@/payload-types'
import { ArticleSearchParams } from '@/interfaces/articles.interfaces'
import { stringify } from 'qs-esm'

export const articlesRequests = {
  getAll: async (params?: ArticleSearchParams) => {
    const andFilters: Where[] = []

    if (params?.types) {
      andFilters.push({ type: { in: params.types } })
    }

    if (params?.search) {
      andFilters.push({
        or: [
          { title: { contains: params.search } },
          { description: { contains: params.search } },
          { author: { contains: params.search } },
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
    return httpClient.get<PaginatedDocs<Article>>(`/articles${queryString}`)
  },
  getById: async (id: string) => {
    return httpClient.get<Article>(`/articles/${id}`)
  },
}
