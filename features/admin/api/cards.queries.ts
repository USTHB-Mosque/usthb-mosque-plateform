import { useQuery } from '@tanstack/react-query'
import { getAdminCards, type AdminCardsParams } from '@/features/admin/server/cards'

export const adminCardsKeys = {
  root: ['admin', 'cards'] as const,
  list: (params: AdminCardsParams) => ['admin', 'cards', 'list', params] as const,
}

export function useGetAdminCardsQuery(params: AdminCardsParams) {
  return useQuery({
    queryKey: adminCardsKeys.list(params),
    queryFn: () => getAdminCards(params),
    placeholderData: (prev) => prev,
  })
}
