import { createMiddleware } from "hono/factory"
import { api } from "@/convex/_generated/api"
import { fetchAuthQuery } from "@/lib/better-auth/auth-server"

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
 * Uses Convex Better Auth to validate sessions.
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    try {
      // Use Convex auth to get the current user
      const authUser = await fetchAuthQuery(api.auth.getCurrentUser)

      if (!authUser) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      // Map Convex auth user to our types
      // Note: Convex Better Auth's getAuthUser only returns user data, not session data
      const userId = authUser.userId ?? ""
      const user: User = {
        id: userId,
        name: authUser.name ?? null,
        email: authUser.email ?? "",
        emailVerified: authUser.emailVerified ?? false,
        createdAt: new Date(authUser.createdAt),
        updatedAt: new Date(authUser.updatedAt),
      }

      // Create a minimal session object using available user data
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      const session: Session = {
        id: userId, // Use userId as session id since sessionId is not available
        userId,
        expiresAt,
        token: "", // Token not available from getAuthUser
        createdAt: new Date(authUser.createdAt),
        updatedAt: new Date(authUser.updatedAt),
        ipAddress: null, // Not available from getAuthUser
        userAgent: c.req.header("user-agent") ?? null, // Get from request headers
      }

      c.set("session", session)
      c.set("user", user)
      await next()
    } catch (error) {
      console.error("Auth middleware error:", error)
      return c.json({ error: "Unauthorized" }, 401)
    }
  }
)
