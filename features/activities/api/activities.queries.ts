import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/shared/lib/http-client'
import { PaginatedDocs, Where } from 'payload'
import { Activity } from '@/payload-types'
import { ActivitySearchParams } from '@/features/activities/types'
import { stringify } from 'qs-esm'

export const activitiesKeys = {
  list: (params?: ActivitySearchParams) => ['activities', 'list', params] as const,
  detail: (id: string) => ['activities', 'detail', id] as const,
}

export async function fetchActivities(params?: ActivitySearchParams) {
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
}

export async function fetchActivityById(id: string) {
  return httpClient.get<Activity>(`/activities/${id}`)
}

export function useGetActivitiesQuery(params?: ActivitySearchParams) {
  return useQuery({
    queryKey: activitiesKeys.list(params),
    queryFn: () => fetchActivities(params),
  })
}

export function useGetActivityByIdQuery(id: string) {
  return useQuery({
    queryKey: activitiesKeys.detail(id),
    queryFn: () => fetchActivityById(id),
  })
}
