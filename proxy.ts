import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const publicRoutes = ["/login", "/signup"]
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

  // Check for session
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  // Redirect to login if no session
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (session && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
