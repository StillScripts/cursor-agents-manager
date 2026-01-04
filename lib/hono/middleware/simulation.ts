import { eq } from "drizzle-orm"
import { createMiddleware } from "hono/factory"
import { auth } from "@/lib/better-auth/auth"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/encryption"
import { userApiKeys } from "@/lib/schema/auth-schema"

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
 * Gets the user's API key from the database.
 */
async function getUserApiKeyFromHeaders(
  headers: Headers
): Promise<string | null> {
  const session = await auth.api.getSession({ headers })

  if (!session) {
    return null
  }

  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, session.user.id))
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
 */
export const withSimulationMode = createMiddleware<{
  Variables: SimulationVariables
}>(async (c, next) => {
  const apiKey = await getUserApiKeyFromHeaders(c.req.raw.headers)
  const simulationMode = !isValidApiKey(apiKey)

  c.set("simulationMode", simulationMode)
  c.set("apiKey", apiKey)
  await next()
})
