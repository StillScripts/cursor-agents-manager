import { convexTest } from "convex-test"
import { vi } from "vitest"
import * as authModule from "../auth"
import schema from "../schema"

// Manually import modules for Bun compatibility
// Include _generated files so convex-test can find the modules root
// Paths should match what import.meta.glob would produce from the convex directory
const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./agents.ts": () => import("../agents"),
  "./branches.ts": () => import("../branches"),
  "./repositories.ts": () => import("../repositories"),
  "./timeLogs.ts": () => import("../timeLogs"),
  "./auth.ts": () => import("../auth"),
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
