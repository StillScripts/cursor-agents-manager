import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/db/encryption"
import { userApiKeys } from "@/lib/db/schema/auth-schema"

/**
 * Server-side function to get user's API key from database
 * Used by server components that need to fetch API keys
 */
export async function getUserApiKeyServer(
  userId: string
): Promise<string | null> {
  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)

  if (!apiKey || !apiKey.encryptedCursorApiKey) {
    return null
  }

  try {
    return decryptData(apiKey.encryptedCursorApiKey)
  } catch (error) {
    console.error("Error decrypting API key:", error)
    return null
  }
}
