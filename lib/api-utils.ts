import { eq } from "drizzle-orm"
import type { NextRequest } from "next/server"
import { auth } from "./better-auth/auth"
import { db } from "./db"
import { decryptData } from "./db/encryption"
import { userApiKeys } from "./db/schema/auth-schema"

export async function getUserApiKey(
  request: NextRequest
): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return null
  }

  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, session.user.id))
    .limit(1)

  if (!apiKey || !apiKey.encryptedCursorApiKey) {
    return null
  }

  return decryptData(apiKey.encryptedCursorApiKey)
}

export async function isSimulationMode(request: NextRequest): Promise<boolean> {
  const apiKey = await getUserApiKey(request)

  // Only use real API if key exists, is not empty, and looks like a real key
  const hasValidKey =
    apiKey &&
    apiKey.trim().length > 10 &&
    !apiKey.includes("undefined") &&
    !apiKey.includes("your-api-key") &&
    !apiKey.includes("placeholder")

  return !hasValidKey
}

export const CURSOR_API_URL = "https://api.cursor.com/v0/agents"
