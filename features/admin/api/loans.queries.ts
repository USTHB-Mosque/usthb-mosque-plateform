import { useQuery } from '@tanstack/react-query'
import { getLoansByStatus } from '@/features/admin/server/loans'
import type { LoanStatus } from '@/utils/constants/loans'

export interface AdminLoansParams {
  status: LoanStatus
  page: number
  limit: number
  search?: string
  overdue?: 'overdue' | 'not-overdue'
}

export const adminLoansKeys = {
  root: ['admin', 'loans'] as const,
  list: (params: AdminLoansParams) => ['admin', 'loans', 'list', params] as const,
}

export function useGetAdminLoansQuery(params: AdminLoansParams) {
  return useQuery({
    queryKey: adminLoansKeys.list(params),
    queryFn: () => getLoansByStatus(params.status, params),
    placeholderData: (prev) => prev,
  })
}
