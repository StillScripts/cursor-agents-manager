import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "better-convex/server"
import { getAuthenticatedUserOrNull } from "./auth"

// ============================================================================
// Public queries/mutations (used directly by frontend)
// ============================================================================

/**
 * Get API keys record for authenticated user
 * Returns null if not authenticated or no record exists
 */
export const getApiKeysRecord = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      return null
    }

    return ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()
  },
})

/**
 * Check if user has a Cursor API key configured
 * Returns { hasKey: boolean, maskedKey: string | null }
 * Note: This doesn't decrypt the key, so masking is generic
 */
export const getCursorApiKeyStatus = query({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      return { hasKey: false, maskedKey: null }
    }

    const record = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (!record?.encryptedCursorApiKey || record.encryptedCursorApiKey === "") {
      return { hasKey: false, maskedKey: null }
    }

    // Return generic mask without decrypting (decryption requires Node.js)
    return { hasKey: true, maskedKey: "****" }
  },
})

/**
 * Check if user has an OpenAI API key configured
 * Returns { hasKey: boolean, maskedKey: string | null }
 * Note: This doesn't decrypt the key, so masking is generic
 */
export const getOpenaiApiKeyStatus = query({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      return { hasKey: false, maskedKey: null }
    }

    const record = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (!record?.encryptedOpenaiApiKey || record.encryptedOpenaiApiKey === "") {
      return { hasKey: false, maskedKey: null }
    }

    // Return generic mask without decrypting (decryption requires Node.js)
    return { hasKey: true, maskedKey: "****" }
  },
})

/**
 * Save/update Cursor API key (encrypted value)
 * Note: Encryption must be done client-side or via action before calling this
 */
export const saveCursorApiKey = mutation({
  args: { encryptedApiKey: v.string() },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedCursorApiKey: args.encryptedApiKey,
      })
      return { success: true }
    }

    await ctx.db.insert("apiKeys", {
      userId: authUser.userId,
      encryptedCursorApiKey: args.encryptedApiKey,
      encryptedOpenaiApiKey: "",
    })

    return { success: true }
  },
})

/**
 * Save/update OpenAI API key (encrypted value)
 * Note: Encryption must be done client-side or via action before calling this
 */
export const saveOpenaiApiKey = mutation({
  args: { encryptedApiKey: v.string() },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedOpenaiApiKey: args.encryptedApiKey,
      })
      return { success: true }
    }

    await ctx.db.insert("apiKeys", {
      userId: authUser.userId,
      encryptedCursorApiKey: "",
      encryptedOpenaiApiKey: args.encryptedApiKey,
    })

    return { success: true }
  },
})

/**
 * Delete Cursor API key
 */
export const deleteCursorApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { encryptedCursorApiKey: "" })
    }

    return { success: true }
  },
})

/**
 * Delete OpenAI API key
 */
export const deleteOpenaiApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { encryptedOpenaiApiKey: "" })
    }

    return { success: true }
  },
})

/**
 * Check if user has a GitHub token configured
 * Returns { hasKey: boolean, maskedKey: string | null }
 * Note: This doesn't decrypt the token, so masking is generic
 */
export const getGithubTokenStatus = query({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      return { hasKey: false, maskedKey: null }
    }

    const record = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (!record?.encryptedGithubToken || record.encryptedGithubToken === "") {
      return { hasKey: false, maskedKey: null }
    }

    // Return generic mask without decrypting (decryption requires Node.js)
    return { hasKey: true, maskedKey: "****" }
  },
})

/**
 * Save/update GitHub token (encrypted value)
 * Note: Encryption must be done client-side or via action before calling this
 */
export const saveGithubToken = mutation({
  args: { encryptedToken: v.string() },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedGithubToken: args.encryptedToken,
      })
      return { success: true }
    }

    await ctx.db.insert("apiKeys", {
      userId: authUser.userId,
      encryptedCursorApiKey: "",
      encryptedOpenaiApiKey: "",
      encryptedGithubToken: args.encryptedToken,
    })

    return { success: true }
  },
})

/**
 * Delete GitHub token
 */
export const deleteGithubToken = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { encryptedGithubToken: "" })
    }

    return { success: true }
  },
})

/**
 * Delete all API keys for user
 */
export const deleteAllApiKeys = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    return { success: true }
  },
})

// ============================================================================
// Internal queries/mutations (called by actions that need encryption/decryption)
// ============================================================================

export const getApiKeysRecordInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()
  },
})

/**
 * Get all users who have a Cursor API key configured
 * Used by the nightly sync job
 */
export const getUsersWithCursorApiKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allApiKeys = await ctx.db.query("apiKeys").collect()

    // Filter to users with non-empty Cursor API keys
    return allApiKeys
      .filter(
        (record) =>
          record.encryptedCursorApiKey && record.encryptedCursorApiKey !== ""
      )
      .map((record) => ({
        userId: record.userId,
        encryptedCursorApiKey: record.encryptedCursorApiKey,
      }))
  },
})

export const upsertApiKeysInternal = internalMutation({
  args: {
    userId: v.string(),
    encryptedCursorApiKey: v.optional(v.string()),
    encryptedOpenaiApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existing) {
      // Build update object with only provided fields
      const updates: Partial<{
        encryptedCursorApiKey: string
        encryptedOpenaiApiKey: string
      }> = {}
      if (args.encryptedCursorApiKey !== undefined) {
        updates.encryptedCursorApiKey = args.encryptedCursorApiKey
      }
      if (args.encryptedOpenaiApiKey !== undefined) {
        updates.encryptedOpenaiApiKey = args.encryptedOpenaiApiKey
      }
      await ctx.db.patch(existing._id, updates)
      return existing._id
    }

    // Create new record
    return ctx.db.insert("apiKeys", {
      userId: args.userId,
      encryptedCursorApiKey: args.encryptedCursorApiKey ?? "",
      encryptedOpenaiApiKey: args.encryptedOpenaiApiKey ?? "",
    })
  },
})
