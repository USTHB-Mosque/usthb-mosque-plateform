import { BaseSearchParams } from '@/interfaces/apis'

export const agentsOnboardingKeys = {
  all: ['books'] as const,
  lists: ['books', 'list'] as const,
  list: (params?: BaseSearchParams) => ['books', 'list', params] as const,

  stats: ['books', 'stats'] as const,

  details: () => ['books', 'detail'] as const,
  detail: (id: string) => ['books', 'detail', id] as const,
}
