import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers as nextHeaders } from 'next/headers'
import { User } from '@/payload-types'
import { httpClient } from './apis/http-client'

export const getAuthenticatedUser = async () => {
  const payload = await getPayload({ config })
  const headers = await nextHeaders()
  const response = await payload.auth({ headers })

  if (!response.user) {
    return undefined
  }

  if (response.user.collection === 'admins') return undefined

  if (response.user.collection === 'users') return response.user as User
}
