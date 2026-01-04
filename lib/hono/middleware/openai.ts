import { eq } from "drizzle-orm"
import { createMiddleware } from "hono/factory"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/db/encryption"
import { userApiKeys } from "@/lib/db/schema/auth-schema"
import type { AuthVariables } from "./auth"

export type OpenAIVariables = {
  openaiApiKey: string
}

// Validate OpenAI API key format
function isValidOpenAIKey(apiKey: string | null): boolean {
  if (!apiKey) return false

  return (
    apiKey.trim().length > 10 &&
    apiKey.startsWith("sk-") && // OpenAI keys start with sk-
    !apiKey.includes("undefined") &&
    !apiKey.includes("your-api-key") &&
    !apiKey.includes("placeholder")
  )
}

export const requireOpenAIKey = createMiddleware<{
  Variables: OpenAIVariables & AuthVariables
}>(async (c, next) => {
  // User is available because requireAuth runs first
  const user = c.get("user")

  // Fetch encrypted key from database
  const [apiKeyRecord] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, user.id))
    .limit(1)

  if (!apiKeyRecord?.encryptedOpenaiApiKey) {
    return c.json(
      {
        error:
          "OpenAI API key not configured. Please add your OpenAI API key in Account settings to enable AI features.",
      },
      400
    )
  }

  // Decrypt key
  let openaiApiKey: string
  try {
    openaiApiKey = decryptData(apiKeyRecord.encryptedOpenaiApiKey)
  } catch (error) {
    console.error("Failed to decrypt OpenAI API key:", error)
    return c.json({ error: "Failed to decrypt OpenAI API key" }, 500)
  }

  // Validate key format (not placeholder)
  if (!isValidOpenAIKey(openaiApiKey)) {
    return c.json(
      {
        error:
          "Invalid OpenAI API key. Please update your key in Account settings.",
      },
      400
    )
  }

  c.set("openaiApiKey", openaiApiKey)
  await next()
})
