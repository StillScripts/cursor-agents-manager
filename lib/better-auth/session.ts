import { cache } from "react"
import { api } from "@/convex/_generated/api"
import { fetchAuthQuery, isAuthenticated } from "@/lib/better-auth/auth-server"

export const getCurrentSession = cache(async () => {
  const authUser = await fetchAuthQuery(api.auth.getCurrentUser)

  if (!authUser) {
    return null
  }

  // Map to the expected session format
  // Note: Convex Better Auth's getAuthUser only returns user data, not session data
  // We create a minimal session object using available user data
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  return {
    user: {
      id: authUser.userId,
      name: authUser.name ?? null,
      email: authUser.email,
      emailVerified: authUser.emailVerified ?? false,
      createdAt: new Date(authUser.createdAt),
      updatedAt: new Date(authUser.updatedAt),
    },
    session: {
      id: authUser.userId, // Use userId as session id since sessionId is not available
      userId: authUser.userId,
      expiresAt,
      token: "", // Token not available from getAuthUser
      createdAt: new Date(authUser.createdAt),
      updatedAt: new Date(authUser.updatedAt),
    },
  }
})

export async function requireAuth() {
  const session = await getCurrentSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

// Re-export isAuthenticated for convenience
export { isAuthenticated }
