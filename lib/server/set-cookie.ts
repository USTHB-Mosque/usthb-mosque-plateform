import { cookies } from 'next/headers'

export async function setPayloadTokenCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('payload-token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
  })
}
