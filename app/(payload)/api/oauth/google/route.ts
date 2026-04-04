import { NextRequest } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const redirectTo = searchParams.get('redirectTo') || '/'

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/oauth/google/callback`,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: redirectTo,
  })

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`

  return Response.redirect(url)
}
