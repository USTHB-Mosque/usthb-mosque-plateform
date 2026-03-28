import { useQuery } from '@tanstack/react-query'
import { activitiesRequests } from './requests'
import { activitiesKeys } from './keys'
import { ActivitySearchParams } from '@/interfaces/activities.interfaces'

export const useGetActivitiesQuery = (params?: ActivitySearchParams) => {
  return useQuery({
    queryKey: activitiesKeys.list(params),
    queryFn: () => activitiesRequests.getAll(params),
  })
}

export const useGetActivityByIdQuery = (id: string) => {
  return useQuery({
    queryKey: activitiesKeys.detail(id),
    queryFn: () => activitiesRequests.getById(id),
  })
}
