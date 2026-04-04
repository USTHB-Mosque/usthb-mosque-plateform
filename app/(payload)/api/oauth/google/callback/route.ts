import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { User } from '@/payload-types'
import { cookies as nextCookies } from 'next/headers'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') || '/'

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth_missing_code', process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'))
  }

  try {
    const payload = await getPayload({ config })

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google')
    }

    const googleUser = await userInfoResponse.json()

    console.log('=== Google OAuth User Info ===')
    console.log(JSON.stringify(googleUser, null, 2))
    console.log('================================')

    const user = await findOrCreateUser(payload, googleUser)

    const { token } = await payload.login({
      collection: 'users',
      data: {
        email: user.email,
        password: user._oauthPassword || generatePassword(),
      },
    })

    const response = NextResponse.redirect(new URL(state, process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'))

    if (token) {
      response.cookies.set('payload-token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
      })
    }

    return response
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'))
  }
}

async function findOrCreateUser(payload: any, googleUser: any): Promise<User & { _oauthPassword?: string }> {
  const sub = googleUser.sub || googleUser.id

  if (!sub) {
    throw new Error('No sub or id found in Google user info')
  }

  const existingBySub = await payload.find({
    collection: 'users',
    where: { sub: { equals: sub } },
    limit: 1,
  })

  if (existingBySub.docs.length > 0) {
    const user = existingBySub.docs[0]
    return { ...user, _oauthPassword: user._oauthPassword || generatePassword() }
  }

  const existingByEmail = await payload.find({
    collection: 'users',
    where: { email: { equals: googleUser.email } },
    limit: 1,
  })

  if (existingByEmail.docs.length > 0) {
    const user = existingByEmail.docs[0]
    const password = generatePassword()
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        sub,
        fullName: user.fullName || googleUser.name,
        password,
      },
      overrideAccess: true,
    })
    return { ...user, sub, _oauthPassword: password }
  }

  const password = generatePassword()

  const newUser = await payload.create({
    collection: 'users',
    data: {
      email: googleUser.email,
      fullName: googleUser.name,
      sub,
      role: 'user',
      password,
    },
  })

  return { ...newUser, _oauthPassword: password }
}

function generatePassword() {
  return Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16)
}
