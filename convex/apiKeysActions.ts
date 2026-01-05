"use node"

import { v } from "convex/values"
import { decryptData, encryptData, maskApiKey } from "../lib/db/encryption"
import { internal } from "./_generated/api"
import { action } from "./_generated/server"

// ============================================================================
// Public actions (handle encryption/decryption)
// ============================================================================

/**
 * Check if user has a Cursor API key configured
 * Returns masked version if exists, null if not
 */
export const getCursorApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedCursorApiKey) {
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
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedCursorApiKey) {
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
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const encrypted = encryptData(args.apiKey)

    await ctx.runMutation(internal.apiKeys.upsertApiKeys, {
      userId: authUser.userId,
      encryptedCursorApiKey: encrypted,
    })

    return { success: true }
  },
})

/**
 * Delete Cursor API key
 */
export const deleteCursorApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    await ctx.runMutation(internal.apiKeys.clearCursorApiKey, {
      userId: authUser.userId,
    })

    return { success: true }
  },
})

/**
 * Check if user has an OpenAI API key configured
 * Returns masked version if exists, null if not
 */
export const getOpenaiApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedOpenaiApiKey) {
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
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedOpenaiApiKey) {
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
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const encrypted = encryptData(args.apiKey)

    await ctx.runMutation(internal.apiKeys.upsertApiKeys, {
      userId: authUser.userId,
      encryptedOpenaiApiKey: encrypted,
    })

    return { success: true }
  },
})

/**
 * Delete OpenAI API key
 */
export const deleteOpenaiApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    await ctx.runMutation(internal.apiKeys.clearOpenaiApiKey, {
      userId: authUser.userId,
    })

    return { success: true }
  },
})

/**
 * Delete all API keys for user
 */
export const deleteAllApiKeys = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    await ctx.runMutation(internal.apiKeys.deleteApiKeysRecord, {
      userId: authUser.userId,
    })

    return { success: true }
  },
})
