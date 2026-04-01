import { httpClient } from '../http-client'
import { PaginatedDocs, Where } from 'payload'
import { Activity } from '@/payload-types'
import { ActivitySearchParams } from '@/interfaces/activities.interfaces'
import { stringify } from 'qs-esm'

export const activitiesRequests = {
  getAll: async (params?: ActivitySearchParams) => {
    const andFilters: Where[] = []

    if (params?.types) {
      andFilters.push({ type: { in: params.types } })
    }

    if (params?.search) {
      andFilters.push({
        or: [
          { title: { contains: params.search } },
          { shortDescription: { contains: params.search } },
          { supervisor: { contains: params.search } },
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
    return httpClient.get<PaginatedDocs<Activity>>(`/activities${queryString}`)
  },
  getById: async (id: string) => {
    return httpClient.get<Activity>(`/activities/${id}`)
  },
}
