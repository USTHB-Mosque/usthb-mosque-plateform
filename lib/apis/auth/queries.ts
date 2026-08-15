import { useMutation, useQuery } from '@tanstack/react-query'
import { authRequests } from './requests'
import { authKeys } from './keys'

export const useLogoutMutation = () => {
  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: authRequests.logout,
  })
}

export const useGetProfileQuery = () => {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: authRequests.getProfile,
    retry: false,
    staleTime: 1000 * 60 * 5,
    throwOnError: false,
  })
}