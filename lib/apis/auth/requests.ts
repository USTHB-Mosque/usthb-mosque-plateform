import { AuthResponse } from '@/interfaces/auth.interfaces'
import { httpClient } from '../http-client'

export const authRequests = {
  logout: async () => {
    const response = await httpClient.post('/users/logout')
    return response.data
  },

  getProfile: async () => {
    const response = await httpClient.get<AuthResponse>('/users/me')
    return response.data
  },
}
