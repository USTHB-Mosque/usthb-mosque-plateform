import { AuthResponse } from '@/interfaces/auth.interfaces'
import { httpClient } from '../http-client'

export const authRequests = {
  logout: async () => {
    return httpClient.post('/users/logout')
  },

  getProfile: async () => {
    return httpClient.get<AuthResponse>('/users/me')
  },
}
