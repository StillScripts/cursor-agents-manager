import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Next.js middleware for route protection
 *
 * Protects all routes in (authenticated) group by requiring valid session.
 * Allows access to (unauthenticated) routes and /api/auth/* without authentication.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to unauthenticated routes
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    // If user is already authenticated, redirect to home
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (session) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  // Allow access to auth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Protect all other routes (including (authenticated) routes)
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    // Redirect to login with callback URL
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

/**
 * Matcher configuration for middleware
 * Only runs middleware on specific paths to improve performance
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
