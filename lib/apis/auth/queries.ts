import { useMutation, useQuery } from '@tanstack/react-query'
import { authRequests } from './requests'
import { authKeys } from './keys'

export const useLogoutMutation = () => {
  return useMutation({
    mutationKey: ['auth'],
    mutationFn: authRequests.logout,
  })
}

export const useGetProfileQuery = () => {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: authRequests.getProfile,
  })
}
