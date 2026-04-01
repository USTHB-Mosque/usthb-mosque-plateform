import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers as nextHeaders } from 'next/headers'
import { User } from '@/payload-types'

export const getAuthenticatedUser = async () => {
  const payload = await getPayload({ config })
  const headers = await nextHeaders()
  const response = await payload.auth({ headers })

  if (!response.user) {
    return undefined
  }

  const user = response.user as User
  if (user.role === 'admin') return undefined

  return user
}
