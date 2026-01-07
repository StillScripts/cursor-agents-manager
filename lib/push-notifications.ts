/**
 * Client-side utilities for sending push notifications via Convex actions
 * 
 * This module provides helper functions to call Convex actions for sending
 * push notifications. The actual sending is handled server-side in Convex.
 * 
 * Requirements:
 * - Install web-push in Convex: Add to package.json dependencies
 * - Set VAPID keys in Convex environment variables:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY (public key)
 *   - VAPID_PRIVATE_KEY (private key)
 *   - VAPID_SUBJECT (mailto: or https: URL)
 */

import { useMutation } from "@tanstack/react-query"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"

export interface PushNotificationPayload {
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
 * React hook to send a push notification
 * This calls the Convex action to send the notification
 */
export function useSendPushNotification() {
  const sendPushNotification = useAction(api.pushNotifications.sendPushNotification)

  return useMutation({
    mutationFn: async (payload: PushNotificationPayload) => {
      return await sendPushNotification({ payload })
    },
  })
}

/**
 * React hook to send an agent status notification
 */
export function useSendAgentStatusNotification() {
  const sendAgentStatusNotification = useAction(
    api.pushNotifications.sendAgentStatusNotification
  )

  return useMutation({
    mutationFn: async (params: {
      agentId: string
      agentName: string
      status: "RUNNING" | "FINISHED" | "ERROR" | "CREATING" | "EXPIRED"
    }) => {
      return await sendAgentStatusNotification({
        agentId: params.agentId,
        agentName: params.agentName,
        status: params.status,
      })
    },
  })
}
