"use node"

import { decryptData } from "../lib/db/encryption"
import { internal } from "./_generated/api"
import { action } from "./_generated/server"

const SIMULATED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "gpt-4o",
  "gpt-4o-mini",
  "o1-preview",
]

const CURSOR_MODELS_API_URL = "https://api.cursor.com/v0/models"

/**
 * Get list of available models
 */
export const getModels = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    models: string[]
    simulation: boolean
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get encrypted API key record
    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      return {
        models: SIMULATED_MODELS,
        simulation: true,
      }
    }

    // Live mode - call Cursor API
    try {
      const response = await fetch(CURSOR_MODELS_API_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        models: data.models || [],
        simulation: false,
      }
    } catch (error) {
      console.error("[Convex getModels] Error fetching models:", error)
      // Fallback to simulated models on error
      return {
        models: SIMULATED_MODELS,
        simulation: true,
      }
    }
  },
})
