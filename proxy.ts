import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/user', '/library/book-requests']

// This is a UX redirect only, not the security boundary: it just checks the
// cookie is present. Every server action, route handler and data read still
// re-verifies the session itself (see lib/auth.ts), since a matcher change
// here must never be the only thing standing between a request and private data.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtected && !token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/user/:path*', '/library/book-requests/:path*'],
}
