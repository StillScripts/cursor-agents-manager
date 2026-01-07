"use node"

import { v } from "convex/values"
import { action, internalMutation, internalQuery } from "./_generated/server"
import { getAuthenticatedUserInternal } from "./auth"
import { api } from "./_generated/api"
import webpush from "web-push"

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ""
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com"

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: Record<string, unknown>
  url?: string
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Internal query to get push subscriptions for a user
 */
const getPushSubscriptionsForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
  },
})

/**
 * Send a push notification to the authenticated user
 */
export const sendPushNotification = action({
  args: {
    payload: v.object({
      title: v.string(),
      body: v.string(),
      icon: v.optional(v.string()),
      badge: v.optional(v.string()),
      tag: v.optional(v.string()),
      requireInteraction: v.optional(v.boolean()),
      data: v.optional(v.any()),
      url: v.optional(v.string()),
      actions: v.optional(
        v.array(
          v.object({
            action: v.string(),
            title: v.string(),
            icon: v.optional(v.string()),
          })
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUserInternal(ctx)

    // Get all push subscriptions for the user
    const subscriptions = await ctx.runQuery(getPushSubscriptionsForUser, {
      userId: authUser.userId,
    })

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 }
    }

    // Prepare notification payload
    const notificationPayload: PushNotificationPayload = {
      title: args.payload.title,
      body: args.payload.body,
      icon: args.payload.icon || "/android-chrome-192x192.png",
      badge: args.payload.badge || "/android-chrome-192x192.png",
      tag: args.payload.tag || "default",
      requireInteraction: args.payload.requireInteraction || false,
      data: {
        ...args.payload.data,
        url: args.payload.url || "/",
      },
      actions: args.payload.actions || [],
    }

    const payloadJson = JSON.stringify(notificationPayload)

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payloadJson
          )
          return { success: true, subscriptionId: sub._id }
        } catch (error) {
          // If subscription is invalid, remove it
          if (error && typeof error === "object" && "statusCode" in error) {
            const statusCode = (error as { statusCode: number }).statusCode
            if (statusCode === 410 || statusCode === 404) {
              // Subscription expired or not found, remove it
              await ctx.runMutation(api.pushSubscriptions.removeSubscriptionById, {
                subscriptionId: sub._id,
              })
            }
          }
          throw error
        }
      })
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    return { sent, failed }
  },
})

/**
 * Send a notification about agent status change
 */
export const sendAgentStatusNotification = action({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    status: v.union(
      v.literal("RUNNING"),
      v.literal("FINISHED"),
      v.literal("ERROR"),
      v.literal("CREATING"),
      v.literal("EXPIRED")
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUserInternal(ctx)

    const statusMessages: Record<
      string,
      { title: string; body: string; requireInteraction: boolean }
    > = {
      RUNNING: {
        title: "Agent Started",
        body: `${args.agentName} has started running`,
        requireInteraction: false,
      },
      FINISHED: {
        title: "Agent Completed",
        body: `${args.agentName} has finished successfully`,
        requireInteraction: true,
      },
      ERROR: {
        title: "Agent Error",
        body: `${args.agentName} encountered an error`,
        requireInteraction: true,
      },
      CREATING: {
        title: "Agent Creating",
        body: `${args.agentName} is being created`,
        requireInteraction: false,
      },
      EXPIRED: {
        title: "Agent Expired",
        body: `${args.agentName} has expired`,
        requireInteraction: false,
      },
    }

    const message =
      statusMessages[args.status] || {
        title: "Agent Update",
        body: `${args.agentName} status changed to ${args.status}`,
        requireInteraction: false,
      }

    return await ctx.runAction(sendPushNotification, {
      payload: {
        ...message,
        tag: `agent-${args.agentId}`,
        url: `/agent/${args.agentId}`,
        data: {
          agentId: args.agentId,
          status: args.status,
        },
      },
    })
  },
})
