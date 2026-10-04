import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/shared/lib/http-client'
import type { PaginatedDocs, Where } from 'payload'
import type { User } from '@/payload-types'
import type { UserSearchParams } from '@/features/users/types'
import { stringify } from 'qs-esm'

export const usersKeys = {
  root: ['users'] as const,
  list: (params?: UserSearchParams) => ['users', 'list', params] as const,
}

export async function fetchUsers(params?: UserSearchParams) {
  const andFilters: Where[] = [{ deletedAt: { exists: false } }]

  if (params?.role) {
    andFilters.push({ role: { equals: params.role } })
  }

  if (params?.verificationStatus?.length) {
    andFilters.push({ verificationStatus: { in: params.verificationStatus } })
  }

  if (params?.faculties?.length) {
    andFilters.push({ faculty: { in: params.faculties } })
  }

  if (params?.studyYears?.length) {
    andFilters.push({ studyYear: { in: params.studyYears } })
  }

  if (params?.search) {
    andFilters.push({
      or: [
        { email: { contains: params.search } },
        { fullName: { contains: params.search } },
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { phone: { contains: params.search } },
      ],
    })
  }

  const query: Where = { and: andFilters }

  const queryString = stringify(
    {
      where: query,
      page: params?.page || 1,
      limit: params?.limit || 20,
      sort: '-createdAt',
      depth: 0,
    },
    { addQueryPrefix: true, encodeValuesOnly: true },
  )

  return httpClient.get<PaginatedDocs<User>>(`/users${queryString}`)
}

export function useGetUsersQuery(params?: UserSearchParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => fetchUsers(params),
  })
}
