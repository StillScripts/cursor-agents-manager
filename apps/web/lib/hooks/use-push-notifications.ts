"use client"

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useCallback, useEffect, useState } from "react"

/**
 * Hook to manage push notification subscriptions
 * Handles requesting permissions, registering subscriptions, and saving to backend
 */
export function usePushNotifications() {
  const saveSubscription = useMutation(api.pushSubscriptions.save)
  const removeSubscription = useMutation(api.pushSubscriptions.remove)

  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  )
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  )

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
      setIsSupported(supported)

      if (supported && "Notification" in window) {
        setPermission(Notification.permission)
      }
    }
  }, [])

  // Get current subscription
  useEffect(() => {
    if (!isSupported) return

    const getSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        setSubscription(sub)
      } catch (error) {
        console.error("[Push Notifications] Error getting subscription:", error)
      }
    }

    getSubscription()
  }, [isSupported])

  // Helper to save subscription
  const saveSubscriptionToBackend = useCallback(
    async (sub: PushSubscription) => {
      const subscriptionData = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
          auth: arrayBufferToBase64(sub.getKey("auth")!),
        },
      }

      await saveSubscription(subscriptionData)
    },
    [saveSubscription]
  )

  // Helper to remove subscription
  const removeSubscriptionFromBackend = useCallback(
    async (sub: PushSubscription) => {
      await removeSubscription({ endpoint: sub.endpoint })
      await sub.unsubscribe()
    },
    [removeSubscription]
  )

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn("[Push Notifications] Not supported in this browser")
      return false
    }

    if (permission === "granted") {
      return true
    }

    if (permission === "denied") {
      console.warn("[Push Notifications] Permission denied")
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === "granted"
    } catch (error) {
      console.error("[Push Notifications] Error requesting permission:", error)
      return false
    }
  }, [isSupported, permission])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn("[Push Notifications] Not supported in this browser")
      return false
    }

    // Request permission first
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      return false
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      let sub = await registration.pushManager.getSubscription()
      if (sub) {
        // Already subscribed, just save to backend
        await saveSubscriptionToBackend(sub)
        setSubscription(sub)
        return true
      }

      // Create new subscription
      // Note: In production, you would get the VAPID public key from your server
      // For now, we'll use a placeholder. The actual key should be stored in env vars
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        console.error(
          "[Push Notifications] VAPID public key not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable."
        )
        return false
      }

      // Convert VAPID key from base64 URL-safe to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      // Save to backend
      await saveSubscriptionToBackend(sub)
      setSubscription(sub)

      return true
    } catch (error) {
      console.error("[Push Notifications] Error subscribing:", error)
      return false
    }
  }, [isSupported, requestPermission, saveSubscriptionMutation])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return true
    }

    try {
      await removeSubscriptionFromBackend(subscription)
      setSubscription(null)
      return true
    } catch (error) {
      console.error("[Push Notifications] Error unsubscribing:", error)
      return false
    }
  }, [subscription, removeSubscriptionFromBackend])

  return {
    isSupported,
    permission,
    isSubscribed: subscription !== null,
    subscribe,
    unsubscribe,
    requestPermission,
  }
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper function to convert VAPID key from base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
