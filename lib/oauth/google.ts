const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

export const GOOGLE_OAUTH_STATE_COOKIE = 'google-oauth-state'

function getRedirectUri(): string {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  return `${serverUrl}/api/oauth/google/callback`
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT)
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '')
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')
  url.searchParams.set('state', state)
  return url.toString()
}

interface GoogleIdentity {
  email: string
  emailVerified: boolean
  name?: string
}

/**
 * Exchanges an authorization code for the caller's verified Google identity.
 * The trust boundary is the direct, server-to-server HTTPS call to Google below,
 * not a locally-verified ID token, which keeps this dependency-free.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleIdentity | null> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!tokenResponse.ok) return null

  const tokenBody = (await tokenResponse.json()) as { access_token?: string }
  if (!tokenBody.access_token) return null

  const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  })

  if (!userInfoResponse.ok) return null

  const userInfo = (await userInfoResponse.json()) as {
    email?: string
    email_verified?: boolean
    name?: string
  }

  if (!userInfo.email) return null

  return {
    email: userInfo.email,
    emailVerified: Boolean(userInfo.email_verified),
    name: userInfo.name,
  }
}
