import { useQuery } from '@tanstack/react-query'
import {
  getAdminCards,
  getCardCandidates,
  type AdminCardsParams,
} from '@/features/admin/server/cards'

export const adminCardsKeys = {
  root: ['admin', 'cards'] as const,
  list: (params: AdminCardsParams) => ['admin', 'cards', 'list', params] as const,
  candidates: (search: string) => ['admin', 'cards', 'candidates', search] as const,
}

export function useGetAdminCardsQuery(params: AdminCardsParams) {
  return useQuery({
    queryKey: adminCardsKeys.list(params),
    queryFn: () => getAdminCards(params),
    placeholderData: (prev) => prev,
  })
}

export function useCardCandidatesQuery(search: string, enabled: boolean) {
  return useQuery({
    queryKey: adminCardsKeys.candidates(search),
    queryFn: () => getCardCandidates(search),
    enabled,
    placeholderData: (prev) => prev,
  })
}
