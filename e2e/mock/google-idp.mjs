import { createServer } from 'node:http'

const port = Number(process.env.E2E_GOOGLE_IDP_PORT || 3200)
const appOrigin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3100'

const identities = {
  'registered-code': { token: 'registered-token', email: 'google.member@gmail.com' },
  'unregistered-code': { token: 'unregistered-token', email: 'unregistered@gmail.com' },
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`)

  if (url.pathname === '/') {
    response.writeHead(200)
    response.end('Mock Google IdP')
    return
  }

  if (url.pathname === '/o/oauth2/v2/auth' && request.method === 'GET') {
    const redirectUri = url.searchParams.get('redirect_uri')
    const state = url.searchParams.get('state')
    if (redirectUri !== `${appOrigin}/api/oauth/google/callback` || !state) {
      sendJson(response, 400, { error: 'invalid_request' })
      return
    }

    // A test-scoped IdP cookie selects the unregistered account without shared
    // state; normal Google button clicks always return the seeded member.
    const code = request.headers.cookie?.includes('e2e-google-identity=unregistered')
      ? 'unregistered-code'
      : 'registered-code'
    const callback = new URL(redirectUri)
    callback.searchParams.set('code', code)
    callback.searchParams.set('state', state)
    response.writeHead(302, { Location: callback.toString() })
    response.end()
    return
  }

  if (url.pathname === '/token' && request.method === 'POST') {
    let body = ''
    for await (const chunk of request) body += chunk
    const params = new URLSearchParams(body)
    const identity = identities[params.get('code')]
    if (
      !identity ||
      params.get('grant_type') !== 'authorization_code' ||
      params.get('redirect_uri') !== `${appOrigin}/api/oauth/google/callback`
    ) {
      sendJson(response, 400, { error: 'invalid_grant' })
      return
    }
    sendJson(response, 200, { access_token: identity.token, token_type: 'Bearer' })
    return
  }

  if (url.pathname === '/userinfo' && request.method === 'GET') {
    const identity = Object.values(identities).find(
      ({ token }) => request.headers.authorization === `Bearer ${token}`,
    )
    if (!identity) {
      sendJson(response, 401, { error: 'invalid_token' })
      return
    }
    sendJson(response, 200, { email: identity.email, email_verified: true })
    return
  }

  sendJson(response, 404, { error: 'not_found' })
}).listen(port, '127.0.0.1')
