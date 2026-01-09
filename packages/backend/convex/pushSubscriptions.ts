import { v } from "convex/values"
import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

/**
 * Save push subscription for the authenticated user
 */
export const save = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const now = Date.now()

    // Check if subscription already exists for this endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first()

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        userId: authUser.userId,
        keys: args.keys,
        updatedAt: now,
      })
      return { success: true, id: existing._id }
    }

    // Create new subscription
    const id = await ctx.db.insert("pushSubscriptions", {
      userId: authUser.userId,
      endpoint: args.endpoint,
      keys: args.keys,
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id }
  },
})

/**
 * Delete push subscription for the authenticated user
 */
export const remove = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    // Find subscription by endpoint and user
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first()

    if (subscription && subscription.userId === authUser.userId) {
      await ctx.db.delete(subscription._id)
      return { success: true }
    }

    return { success: false, error: "Subscription not found" }
  },
})

/**
 * Get all push subscriptions for a user (internal use only)
 */
export const getByUserId = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()

    return subscriptions
  },
})

/**
 * Remove subscription by endpoint (internal use only)
 */
export const removeByEndpoint = internalMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first()

    if (subscription) {
      await ctx.db.delete(subscription._id)
      return { success: true }
    }

    return { success: false, error: "Subscription not found" }
  },
})
