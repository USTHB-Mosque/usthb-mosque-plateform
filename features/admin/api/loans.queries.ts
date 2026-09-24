import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/shared/lib/http-client'
import type { PaginatedDocs, Where } from 'payload'
import type { Loan } from '@/payload-types'
import type { LoanStatus } from '@/utils/constants/loans'
import { stringify } from 'qs-esm'

export interface AdminLoansParams {
  status: LoanStatus
  page: number
  limit: number
}

export const adminLoansKeys = {
  list: (params: AdminLoansParams) => ['admin', 'loans', 'list', params] as const,
}

export async function fetchAdminLoans(params: AdminLoansParams) {
  const where: Where = { status: { equals: params.status } }

  const queryString = stringify(
    {
      where,
      page: params.page,
      limit: params.limit,
      sort: '-createdAt',
      depth: 2,
    },
    { addQueryPrefix: true, encodeValuesOnly: true },
  )

  return httpClient.get<PaginatedDocs<Loan>>(`/loans${queryString}`)
}

export function useGetAdminLoansQuery(params: AdminLoansParams) {
  return useQuery({
    queryKey: adminLoansKeys.list(params),
    queryFn: () => fetchAdminLoans(params),
    placeholderData: (prev) => prev,
  })
}
