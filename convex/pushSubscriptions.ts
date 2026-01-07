import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getPushSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    return subscriptions.map((sub) => ({
      _id: sub._id,
      endpoint: sub.endpoint,
      createdAt: sub.createdAt,
      lastUsed: sub.lastUsed,
    }))
  },
})

export const subscribeToPush = mutation({
  args: {
    subscription: v.object({
      endpoint: v.string(),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.subscription.endpoint))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        userId: authUser.userId,
        p256dh: args.subscription.keys.p256dh,
        auth: args.subscription.keys.auth,
        userAgent: args.userAgent,
        lastUsed: now,
      })
      return { _id: existing._id, created: false }
    }

    // Create new subscription
    const _id = await ctx.db.insert("pushSubscriptions", {
      userId: authUser.userId,
      endpoint: args.subscription.endpoint,
      p256dh: args.subscription.keys.p256dh,
      auth: args.subscription.keys.auth,
      userAgent: args.userAgent,
      createdAt: now,
      lastUsed: now,
    })

    return { _id, created: true }
  },
})

export const unsubscribeFromPush = mutation({
  args: {
    endpoint: v.optional(v.string()),
    subscriptionId: v.optional(v.id("pushSubscriptions")),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    if (args.subscriptionId) {
      // Delete by ID
      const subscription = await ctx.db.get(args.subscriptionId)
      if (subscription && subscription.userId === authUser.userId) {
        await ctx.db.delete(args.subscriptionId)
        return { deleted: true }
      }
      return { deleted: false }
    }

    if (args.endpoint) {
      // Delete by endpoint
      const subscription = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint!))
        .first()

      if (subscription && subscription.userId === authUser.userId) {
        await ctx.db.delete(subscription._id)
        return { deleted: true }
      }
      return { deleted: false }
    }

    // Delete all subscriptions for user
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    for (const sub of subscriptions) {
      await ctx.db.delete(sub._id)
    }

    return { deleted: subscriptions.length > 0 }
  },
})

/**
 * Internal mutation to remove a subscription by ID
 * Used when a push notification fails due to invalid subscription
 */
export const removeSubscriptionById = internalMutation({
  args: {
    subscriptionId: v.id("pushSubscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId)
    if (subscription) {
      await ctx.db.delete(args.subscriptionId)
      return { deleted: true }
    }
    return { deleted: false }
  },
})
