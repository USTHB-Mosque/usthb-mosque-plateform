import { useMutation, useQuery } from '@tanstack/react-query'
import { ProfileResponse } from '@/interfaces/auth.interfaces'
import { httpClient } from './http-client'

export const authKeys = {
  profile: ['profile'] as const,
}

export async function logoutRequest() {
  return httpClient.post('/users/logout', undefined, { useAuth: true })
}

export async function fetchProfile() {
  return httpClient.get<ProfileResponse>('/users/me', { useAuth: false })
}

export function useLogoutMutation() {
  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: logoutRequest,
  })
}

export function useGetProfileQuery() {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: fetchProfile,
    retry: false,
    staleTime: 1000 * 60 * 5,
    throwOnError: false,
  })
}
