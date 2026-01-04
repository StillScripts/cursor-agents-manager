import { createMiddleware } from "hono/factory"
import { auth } from "@/lib/better-auth/auth"

// Types from Better Auth
type User = {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

type Session = {
  id: string
  userId: string
  expiresAt: Date
  token: string
  createdAt: Date
  updatedAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}

// Context variables for authenticated routes
export type AuthVariables = {
  session: Session
  user: User
}

/**
 * Middleware that requires authentication.
 * Sets `session` and `user` in the Hono context for downstream handlers.
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    c.set("session", session.session as Session)
    c.set("user", session.user as User)
    await next()
  }
)
