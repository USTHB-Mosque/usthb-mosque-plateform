import { useQuery } from '@tanstack/react-query'
import { getAdminExtensions } from '@/features/admin/server/extensions'
import type { AdminExtensionsParams } from '@/features/admin/server/extensions'

export const adminExtensionsKeys = {
  root: ['admin', 'extensions'] as const,
  list: (params: AdminExtensionsParams) => ['admin', 'extensions', 'list', params] as const,
}

export function useGetAdminExtensionsQuery(params: AdminExtensionsParams) {
  return useQuery({
    queryKey: adminExtensionsKeys.list(params),
    queryFn: () => getAdminExtensions(params),
    placeholderData: (prev) => prev,
  })
}
