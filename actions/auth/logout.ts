'use server'
import { cookies as nextCookies } from 'next/headers'

export const logout = async () => {
  const cookies = await nextCookies()
  
  cookies.delete('payload-token')
  
  return { ok: true }
}