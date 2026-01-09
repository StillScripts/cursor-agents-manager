import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/better-auth/auth-server"

const publicRoutes = ["/login", "/signup", "/"]
const authRoutes = ["/login", "/signup"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes, API routes, and static files
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/manifest.json") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check for session using Convex auth
  const authenticated = await isAuthenticated()

  // Redirect to login if no session
  if (!authenticated) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (authenticated && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/agents", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
