import { User } from '@/payload-types'

export interface AuthResponse {
  user: User
  updatedAt: string
  createdAt: string
  email: string
  sessions: {
    id: string
    createdAt: string
    expiresAt: string
  }[]
  collection: string
  strategy: string
  exp: number
  token: string
  message: string
}
