"use node"

import { v } from "convex/values"
import { decryptData, encryptData, maskApiKey } from "encryption"
import { api, internal } from "./_generated/api"
import { action } from "./_generated/server"

// ============================================================================
// Actions that handle encryption/decryption (require Node.js crypto)
// ============================================================================

/**
 * Check if user has a Cursor API key configured with proper masking
 * Returns masked version if exists, null if not
 * This action is needed because decryption requires Node.js crypto
 */
export const getCursorApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const record = await ctx.runQuery(api.apiKeys.getApiKeysRecord)

    if (!record?.encryptedCursorApiKey || record.encryptedCursorApiKey === "") {
      return { hasKey: false, maskedKey: null }
    }

    try {
      const decrypted = decryptData(record.encryptedCursorApiKey)
      return { hasKey: true, maskedKey: maskApiKey(decrypted) }
    } catch {
      return { hasKey: false, maskedKey: null }
    }
  },
})

/**
 * Get the decrypted Cursor API key (for server-side use)
 */
export const getDecryptedCursorApiKey = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: (await ctx.runQuery(internal.auth.getAuthenticatedUserInternal))
          .userId,
      }
    )

    if (!record?.encryptedCursorApiKey || record.encryptedCursorApiKey === "") {
      return null
    }

    try {
      return decryptData(record.encryptedCursorApiKey)
    } catch {
      return null
    }
  },
})

/**
 * Save/update Cursor API key (encrypts before storing)
 */
export const saveCursorApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const encrypted = encryptData(args.apiKey)
    await ctx.runMutation(api.apiKeys.saveCursorApiKey, {
      encryptedApiKey: encrypted,
    })
    return { success: true }
  },
})

/**
 * Check if user has an OpenAI API key configured with proper masking
 * Returns masked version if exists, null if not
 * This action is needed because decryption requires Node.js crypto
 */
export const getOpenaiApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const record = await ctx.runQuery(api.apiKeys.getApiKeysRecord)

    if (!record?.encryptedOpenaiApiKey || record.encryptedOpenaiApiKey === "") {
      return { hasKey: false, maskedKey: null }
    }

    try {
      const decrypted = decryptData(record.encryptedOpenaiApiKey)
      return { hasKey: true, maskedKey: maskApiKey(decrypted) }
    } catch {
      return { hasKey: false, maskedKey: null }
    }
  },
})

/**
 * Get the decrypted OpenAI API key (for server-side use)
 */
export const getDecryptedOpenaiApiKey = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: (await ctx.runQuery(internal.auth.getAuthenticatedUserInternal))
          .userId,
      }
    )

    if (!record?.encryptedOpenaiApiKey || record.encryptedOpenaiApiKey === "") {
      return null
    }

    try {
      return decryptData(record.encryptedOpenaiApiKey)
    } catch {
      return null
    }
  },
})

/**
 * Save/update OpenAI API key (encrypts before storing)
 */
export const saveOpenaiApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const encrypted = encryptData(args.apiKey)
    await ctx.runMutation(api.apiKeys.saveOpenaiApiKey, {
      encryptedApiKey: encrypted,
    })
    return { success: true }
  },
})

/**
 * Check if user has a Verso API key configured with proper masking
 * Returns masked version if exists, null if not
 * This action is needed because decryption requires Node.js crypto
 */
export const getVersoApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const record = await ctx.runQuery(api.apiKeys.getApiKeysRecord)

    if (!record?.encryptedVersoApiKey || record.encryptedVersoApiKey === "") {
      return { hasKey: false, maskedKey: null }
    }

    try {
      const decrypted = decryptData(record.encryptedVersoApiKey)
      return { hasKey: true, maskedKey: maskApiKey(decrypted) }
    } catch {
      return { hasKey: false, maskedKey: null }
    }
  },
})

/**
 * Get the decrypted Verso API key (for server-side use)
 */
export const getDecryptedVersoApiKey = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: (await ctx.runQuery(internal.auth.getAuthenticatedUserInternal))
          .userId,
      }
    )

    if (!record?.encryptedVersoApiKey || record.encryptedVersoApiKey === "") {
      return null
    }

    try {
      return decryptData(record.encryptedVersoApiKey)
    } catch {
      return null
    }
  },
})

/**
 * Save/update Verso API key (encrypts before storing)
 */
export const saveVersoApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const encrypted = encryptData(args.apiKey)
    await ctx.runMutation(api.apiKeys.saveVersoApiKey, {
      encryptedApiKey: encrypted,
    })
    return { success: true }
  },
})

/**
 * Delete Verso API key
 * Thin wrapper around mutation (no encryption needed)
 */
export const deleteVersoApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    return await ctx.runMutation(api.apiKeys.deleteVersoApiKey)
  },
})

/**
 * Get the user's preferred AI provider
 */
export const getAiProvider = action({
  args: {},
  handler: async (ctx): Promise<"openai" | "verso"> => {
    return await ctx.runQuery(api.apiKeys.getAiProvider)
  },
})

/**
 * Set the user's preferred AI provider
 */
export const setAiProvider = action({
  args: { provider: v.union(v.literal("openai"), v.literal("verso")) },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    await ctx.runMutation(api.apiKeys.setAiProvider, {
      provider: args.provider,
    })
    return { success: true }
  },
})

/**
 * Delete Cursor API key
 * Thin wrapper around mutation (no encryption needed)
 */
export const deleteCursorApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    return await ctx.runMutation(api.apiKeys.deleteCursorApiKey)
  },
})

/**
 * Delete OpenAI API key
 * Thin wrapper around mutation (no encryption needed)
 */
export const deleteOpenaiApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    return await ctx.runMutation(api.apiKeys.deleteOpenaiApiKey)
  },
})

/**
 * Delete all API keys for user
 * Thin wrapper around mutation (no encryption needed)
 */
export const deleteAllApiKeys = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    return await ctx.runMutation(api.apiKeys.deleteAllApiKeys)
  },
})
