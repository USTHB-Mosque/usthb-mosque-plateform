import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizationUrl,
  isGoogleOAuthConfigured,
} from '@/lib/oauth/google'

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const state = randomUUID()
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state))

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    maxAge: 60 * 10,
  })

  return response
}
