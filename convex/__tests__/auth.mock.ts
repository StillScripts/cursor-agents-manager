import type { MutationCtx, QueryCtx } from "../_generated/server"

/**
 * Mock version of getAuthenticatedUser for tests.
 * Returns userId based on the identity from ctx.auth.getUserIdentity()
 *
 * This mock bypasses the betterAuth component entirely.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: string }> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity?.subject) {
    throw new Error("Unauthorized")
  }
  // Return userId from identity.subject (this is the mock)
  return { userId: identity.subject }
}

// Export empty objects for other exports that might be imported
export const authComponent = {} as any
export const createAuth = () => ({}) as any
export const getCurrentUser = {} as any
export const getAuthenticatedUserInternal = {} as any
export const createTestUser = {} as any
