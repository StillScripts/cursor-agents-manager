import { convexTest } from "convex-test"
import { vi } from "vitest"
import * as authModule from "@/convex/auth"
import schema from "@/convex/schema"

// Manually import modules for Bun compatibility
// Include _generated files so convex-test can find the modules root
// Paths should match what import.meta.glob would produce from the convex directory
const modules = {
  "./_generated/api.ts": () => import("@/convex/_generated/api"),
  "./_generated/server.ts": () => import("@/convex/_generated/server"),
  "./agents.ts": () => import("@/convex/agents"),
  "./branches.ts": () => import("@/convex/branches"),
  "./repositories.ts": () => import("@/convex/repositories"),
  "./timeLogs.ts": () => import("@/convex/timeLogs"),
  "./auth.ts": () => import("@/convex/auth"),
  "./apiKeys.ts": () => import("@/convex/apiKeys"),
  "./apiKeysActions.ts": () => import("@/convex/apiKeysActions"),
  "./openAI.ts": () => import("@/convex/openAI"),
  // Add more modules as needed
}

/**
 * Creates a convex-test instance with getAuthenticatedUser properly mocked.
 *
 * The mock implementation:
 * 1. Reads the identity from ctx.auth.getUserIdentity() (provided by convex-test)
 * 2. Extracts the subject field as the userId
 * 3. Throws "Unauthorized" if no identity or subject exists
 *
 * This bypasses Better Auth's database lookup and uses the mock identity system.
 *
 * @returns A ConvexTest instance with authentication mocked
 */
export function createTestInstance() {
  const t = convexTest(schema, modules)

  // Mock getAuthenticatedUser to use the identity from convex-test
  // This bypasses Better Auth's database lookup
  // This mock will be used even when called from getAuthenticatedUserInternal
  vi.spyOn(authModule, "getAuthenticatedUser").mockImplementation(
    async (ctx) => {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity?.subject) {
        throw new Error("Unauthorized")
      }
      // Use identity.subject as userId (this is what convex-test generates)
      return { userId: identity.subject }
    }
  )

  // Also mock authComponent.getAuthUser to prevent component registration errors
  // This is called by getAuthenticatedUser, so we need to mock it too
  // Wrap in try-catch to handle cases where authComponent might not be available
  try {
    if (
      authModule.authComponent &&
      typeof authModule.authComponent.getAuthUser === "function"
    ) {
      vi.spyOn(authModule.authComponent, "getAuthUser").mockImplementation(
        async (ctx) => {
          const identity = await ctx.auth.getUserIdentity()
          if (!identity?.subject) {
            return null
          }
          // Return a mock user object with _id matching the identity subject
          return {
            _id: identity.subject,
            name: identity.name,
            email: identity.email || `${identity.subject}@test.com`,
          } as any
        }
      )
    }
  } catch {
    // If authComponent is not available, the getAuthenticatedUser mock should be sufficient
    // This can happen if better-auth modules fail to load in test environment
    console.warn(
      "Could not mock authComponent.getAuthUser, relying on getAuthenticatedUser mock only"
    )
  }

  return t
}

/**
 * Creates a test instance with a specific user identity.
 * This is a convenience wrapper around createTestInstance().withIdentity()
 *
 * @param identity - Identity attributes (name, subject, etc.)
 * @returns A ConvexTest instance scoped to the specified identity
 *
 * @example
 * ```ts
 * const asUser = createTestWithUser({ name: "Alice" })
 * await asUser.mutation(api.branches.saveBranches, { branches: [...] })
 * ```
 */
export function createTestWithUser(identity = { name: "Test User" }) {
  const t = createTestInstance()
  return t.withIdentity(identity)
}

/**
 * Creates multiple test instances with different user identities.
 * Useful for testing multi-user scenarios.
 *
 * @param identities - Array of identity attributes
 * @returns Array of ConvexTest instances, one per identity
 *
 * @example
 * ```ts
 * const [alice, bob] = createTestUsers([
 *   { name: "Alice" },
 *   { name: "Bob" }
 * ])
 * ```
 */
export function createTestUsers(
  identities = [{ name: "User 1" }, { name: "User 2" }]
) {
  const t = createTestInstance()
  return identities.map((identity) => t.withIdentity(identity))
}
