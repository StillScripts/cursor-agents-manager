import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"

// ============================================================================
// Internal queries/mutations (called by actions in apiKeysActions.ts)
// ============================================================================

export const getApiKeysRecord = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()
  },
})

export const upsertApiKeys = internalMutation({
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

export const deleteApiKeysRecord = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})

export const clearCursorApiKey = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { encryptedCursorApiKey: "" })
    }
  },
})

export const clearOpenaiApiKey = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { encryptedOpenaiApiKey: "" })
    }
  },
})
