import { ActivitySearchParams } from '@/interfaces/activities.interfaces'

export const activitiesKeys = {
  all: ['activities'] as const,
  lists: ['activities', 'list'] as const,
  list: (params?: ActivitySearchParams) => ['activities', 'list', params] as const,

  details: () => ['activities', 'detail'] as const,
  detail: (id: string) => ['activities', 'detail', id] as const,
}
