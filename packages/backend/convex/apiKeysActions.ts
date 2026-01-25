"use node"

import { v } from "convex/values"
import { decryptData, encryptData, maskApiKey } from "encryption"
import { api, internal } from "./_generated/api"
import { action } from "better-convex/server"

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

/**
 * Check if user has a GitHub token configured with proper masking
 * Returns masked version if exists, null if not
 * This action is needed because decryption requires Node.js crypto
 */
export const getGithubTokenStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const record = await ctx.runQuery(api.apiKeys.getApiKeysRecord)

    if (!record?.encryptedGithubToken || record.encryptedGithubToken === "") {
      return { hasKey: false, maskedKey: null }
    }

    try {
      const decrypted = decryptData(record.encryptedGithubToken)
      return { hasKey: true, maskedKey: maskApiKey(decrypted) }
    } catch {
      return { hasKey: false, maskedKey: null }
    }
  },
})

/**
 * Get the decrypted GitHub token (for server-side use)
 */
export const getDecryptedGithubToken = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: (await ctx.runQuery(internal.auth.getAuthenticatedUserInternal))
          .userId,
      }
    )

    if (!record?.encryptedGithubToken || record.encryptedGithubToken === "") {
      return null
    }

    try {
      return decryptData(record.encryptedGithubToken)
    } catch {
      return null
    }
  },
})

/**
 * Save/update GitHub token (encrypts before storing)
 */
export const saveGithubToken = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const encrypted = encryptData(args.token)
    await ctx.runMutation(api.apiKeys.saveGithubToken, {
      encryptedToken: encrypted,
    })
    return { success: true }
  },
})

/**
 * Delete GitHub token
 * Thin wrapper around mutation (no encryption needed)
 */
export const deleteGithubToken = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    return await ctx.runMutation(api.apiKeys.deleteGithubToken)
  },
})
