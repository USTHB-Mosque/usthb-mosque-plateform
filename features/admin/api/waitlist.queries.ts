import { useQuery } from '@tanstack/react-query'
import { getWaitlist } from '@/features/admin/server/waitlist'
import type { WaitlistQuery } from '@/features/admin/server/waitlist'

export const adminWaitlistKeys = {
  root: ['admin', 'waitlist'] as const,
  list: (params: WaitlistQuery) => ['admin', 'waitlist', 'list', params] as const,
}

export function useGetWaitlistQuery(params: WaitlistQuery) {
  return useQuery({
    queryKey: adminWaitlistKeys.list(params),
    queryFn: () => getWaitlist(params),
    placeholderData: (prev) => prev,
  })
}
