import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createSessionForUser, setPayloadTokenCookie } from '@/lib/auth'
import { GOOGLE_OAUTH_STATE_COOKIE, exchangeGoogleCode } from '@/lib/oauth/google'
import type { User } from '@/payload-types'

function redirectClearingState(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url))
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const returnedState = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return redirectClearingState(request, '/auth/login')
  }

  try {
    const identity = await exchangeGoogleCode(code)

    // Only an already-verified Google email may sign in, and only into an
    // existing, already-registered account: Law 18-07 requires explicit
    // consent and a reviewed verification document at signup, neither of
    // which a Google account can supply, so this never creates a new user.
    if (!identity || !identity.emailVerified) {
      return redirectClearingState(request, '/auth/login')
    }

    const payload = await getPayload({ config })
    const matches = await payload.find({
      collection: 'users',
      where: { email: { equals: identity.email.toLowerCase() } },
      limit: 1,
      overrideAccess: true,
    })
    const user = matches.docs[0] as User | undefined

    if (!user || user.role === 'admin') {
      return redirectClearingState(request, '/auth/login')
    }

    const { token, exp } = await createSessionForUser(payload, user)
    await setPayloadTokenCookie(token, exp)

    return redirectClearingState(request, '/user/dashboard')
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return redirectClearingState(request, '/auth/login')
  }
}
