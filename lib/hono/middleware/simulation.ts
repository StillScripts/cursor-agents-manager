import { eq } from "drizzle-orm"
import { createMiddleware } from "hono/factory"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/db/encryption"
import { userApiKeys } from "@/lib/db/schema/auth-schema"
import type { AuthVariables } from "@/lib/hono/middleware/auth"

// Context variables for simulation mode detection
export type SimulationVariables = {
  simulationMode: boolean
  apiKey: string | null
}

/**
 * Checks if the given API key is valid for live mode.
 */
function isValidApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false

  return (
    apiKey.trim().length > 10 &&
    !apiKey.includes("undefined") &&
    !apiKey.includes("your-api-key") &&
    !apiKey.includes("placeholder")
  )
}

/**
 * Gets the user's API key from the database using the user ID.
 * Still uses Drizzle for API key storage (not migrated to Convex yet).
 */
async function getUserApiKeyFromUserId(userId: string): Promise<string | null> {
  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)

  if (!apiKey || !apiKey.encryptedApiKey) {
    return null
  }

  try {
    return decryptData(apiKey.encryptedApiKey)
  } catch {
    return null
  }
}

/**
 * Middleware that detects whether to use simulation mode or live API.
 * Sets `simulationMode` and `apiKey` in the Hono context.
 *
 * Note: This middleware expects `requireAuth` to run first and set `user` in context.
 */
export const withSimulationMode = createMiddleware<{
  Variables: SimulationVariables & AuthVariables
}>(async (c, next) => {
  // Get user from auth middleware (set by requireAuth)
  const user = c.get("user")

  if (!user) {
    // If no user, force simulation mode
    c.set("simulationMode", true)
    c.set("apiKey", null)
    await next()
    return
  }

  const apiKey = await getUserApiKeyFromUserId(user.id)
  const simulationMode = !isValidApiKey(apiKey)

  c.set("simulationMode", simulationMode)
  c.set("apiKey", apiKey)
  await next()
})
