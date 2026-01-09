"use node"

import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

/**
 * Send push notification to user's devices
 * This is called internally after agent updates
 * It calls the Next.js API route to send the actual push notification
 */
export const sendAgentUpdateNotification = internalAction({
  args: {
    userId: v.string(),
    agentId: v.string(),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user's push subscriptions
    const subscriptions = await ctx.runQuery(internal.pushSubscriptions.getByUserId, {
      userId: args.userId,
    })

    if (subscriptions.length === 0) {
      console.log(
        `[Push Notifications] No subscriptions found for user ${args.userId}`
      )
      return { sent: 0, total: 0 }
    }

    // Get the app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Call Next.js API route to send push notifications
    try {
      const response = await fetch(`${appUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptions,
          notification: {
            title: "Agent Update",
            body: `${args.agentName} has been updated.`,
            icon: "/android-chrome-192x192.png",
            badge: "/favicon-32x32.png",
            tag: `agent-update-${args.agentId}`,
            data: {
              agentId: args.agentId,
              url: `/agent/${args.agentId}`,
            },
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(
          `Failed to send push notifications: ${response.status} ${errorText}`
        )
      }

      const result = await response.json()

      // Remove invalid subscriptions
      if (result.invalidEndpoints && result.invalidEndpoints.length > 0) {
        for (const endpoint of result.invalidEndpoints) {
          try {
            await ctx.runMutation(internal.pushSubscriptions.removeByEndpoint, {
              endpoint,
            })
          } catch (removeError) {
            console.error(
              `[Push Notifications] Error removing invalid subscription:`,
              removeError
            )
          }
        }
      }

      return {
        sent: result.sent || 0,
        total: subscriptions.length,
        invalidEndpoints: result.invalidEndpoints || [],
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("[Push Notifications] Error sending notifications:", errorMessage)
      return {
        sent: 0,
        total: subscriptions.length,
        error: errorMessage,
      }
    }
  },
})
