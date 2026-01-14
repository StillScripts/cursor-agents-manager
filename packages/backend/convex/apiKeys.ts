import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
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
 * Check if user has a Verso API key configured
 * Returns { hasKey: boolean, maskedKey: string | null }
 * Note: This doesn't decrypt the key, so masking is generic
 */
export const getVersoApiKeyStatus = query({
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

    if (!record?.encryptedVersoApiKey || record.encryptedVersoApiKey === "") {
      return { hasKey: false, maskedKey: null }
    }

    // Return generic mask without decrypting (decryption requires Node.js)
    return { hasKey: true, maskedKey: "****" }
  },
})

/**
 * Get the user's preferred AI provider
 * Returns "openai" or "verso", defaults to "openai" if not set
 */
export const getAiProvider = query({
  args: {},
  handler: async (ctx): Promise<"openai" | "verso"> => {
    const authUser = await getAuthenticatedUserOrNull(ctx)
    if (!authUser) {
      return "openai"
    }

    const record = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .first()

    return record?.aiProvider ?? "openai"
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
      encryptedVersoApiKey: "",
      aiProvider: "openai",
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
      encryptedVersoApiKey: "",
      aiProvider: "openai",
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
 * Save/update Verso API key (encrypted value)
 * Note: Encryption must be done client-side or via action before calling this
 */
export const saveVersoApiKey = mutation({
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
        encryptedVersoApiKey: args.encryptedApiKey,
      })
      return { success: true }
    }

    await ctx.db.insert("apiKeys", {
      userId: authUser.userId,
      encryptedCursorApiKey: "",
      encryptedOpenaiApiKey: "",
      encryptedVersoApiKey: args.encryptedApiKey,
      aiProvider: "verso",
    })

    return { success: true }
  },
})

/**
 * Set the preferred AI provider
 */
export const setAiProvider = mutation({
  args: { provider: v.union(v.literal("openai"), v.literal("verso")) },
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
      await ctx.db.patch(existing._id, { aiProvider: args.provider })
    } else {
      // Create new record with default empty keys
      await ctx.db.insert("apiKeys", {
        userId: authUser.userId,
        encryptedCursorApiKey: "",
        encryptedOpenaiApiKey: "",
        encryptedVersoApiKey: "",
        aiProvider: args.provider,
      })
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
 * Delete Verso API key
 */
export const deleteVersoApiKey = mutation({
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
      await ctx.db.patch(existing._id, { encryptedVersoApiKey: "" })
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
    encryptedVersoApiKey: v.optional(v.string()),
    aiProvider: v.optional(v.union(v.literal("openai"), v.literal("verso"))),
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
        encryptedVersoApiKey: string
        aiProvider: "openai" | "verso"
      }> = {}
      if (args.encryptedCursorApiKey !== undefined) {
        updates.encryptedCursorApiKey = args.encryptedCursorApiKey
      }
      if (args.encryptedOpenaiApiKey !== undefined) {
        updates.encryptedOpenaiApiKey = args.encryptedOpenaiApiKey
      }
      if (args.encryptedVersoApiKey !== undefined) {
        updates.encryptedVersoApiKey = args.encryptedVersoApiKey
      }
      if (args.aiProvider !== undefined) {
        updates.aiProvider = args.aiProvider
      }
      await ctx.db.patch(existing._id, updates)
      return existing._id
    }

    // Create new record
    return ctx.db.insert("apiKeys", {
      userId: args.userId,
      encryptedCursorApiKey: args.encryptedCursorApiKey ?? "",
      encryptedOpenaiApiKey: args.encryptedOpenaiApiKey ?? "",
      encryptedVersoApiKey: args.encryptedVersoApiKey ?? "",
      aiProvider: args.aiProvider ?? "openai",
    })
  },
})
