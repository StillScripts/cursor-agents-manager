"use client"

import { useCallback, useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "./use-session"

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission
  subscription: PushSubscription | null
  isLoading: boolean
  error: Error | null
}

const PUSH_NOTIFICATIONS_QUERY_KEY = ["push-notifications"] as const

// Get VAPID public key
async function getVapidPublicKey(): Promise<string> {
  const response = await fetch("/api/push/vapid-public-key")
  if (!response.ok) {
    throw new Error("Failed to get VAPID public key")
  }
  const data = await response.json()
  return data.publicKey
}

// Convert base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Subscribe to push notifications
async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription> {
  const vapidPublicKey = await getVapidPublicKey()
  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  })

  const p256dh = subscription.getKey("p256dh")
  const auth = subscription.getKey("auth")

  if (!p256dh || !auth) {
    throw new Error("Failed to get subscription keys")
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(p256dh),
      auth: arrayBufferToBase64(auth),
    },
  }
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// Save subscription to server
async function saveSubscription(
  subscription: PushSubscription
): Promise<{ _id: string; created: boolean }> {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription,
      userAgent: navigator.userAgent,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to save subscription")
  }

  return response.json()
}

// Remove subscription from server
async function removeSubscription(endpoint?: string): Promise<{ deleted: boolean }> {
  const response = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  })

  if (!response.ok) {
    throw new Error("Failed to remove subscription")
  }

  return response.json()
}

export function usePushNotifications() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    subscription: null,
    isLoading: false,
    error: null,
  })

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window === "undefined") return

    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window

    const permission = Notification.permission

    setState((prev) => ({
      ...prev,
      isSupported,
      permission,
    }))

    // Check current subscription status
    if (isSupported && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          if (subscription) {
            const p256dh = subscription.getKey("p256dh")
            const auth = subscription.getKey("auth")

            if (p256dh && auth) {
              setState((prev) => ({
                ...prev,
                isSubscribed: true,
                subscription: {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: arrayBufferToBase64(p256dh),
                    auth: arrayBufferToBase64(auth),
                  },
                },
              }))
            }
          }
        })
      })
    }
  }, [])

  // Request permission mutation
  const requestPermissionMutation = useMutation({
    mutationFn: async () => {
      if (!state.isSupported) {
        throw new Error("Push notifications are not supported")
      }

      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      if (permission !== "granted") {
        throw new Error("Notification permission denied")
      }

      return permission
    },
  })

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!state.isSupported) {
        throw new Error("Push notifications are not supported")
      }

      if (state.permission !== "granted") {
        // Request permission first
        await requestPermissionMutation.mutateAsync()
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready

        // Subscribe to push
        const subscription = await subscribeToPush(registration)

        // Save to server
        await saveSubscription(subscription)

        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          subscription,
          isLoading: false,
        }))

        queryClient.invalidateQueries({ queryKey: PUSH_NOTIFICATIONS_QUERY_KEY })

        return subscription
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error")
        setState((prev) => ({
          ...prev,
          error: err,
          isLoading: false,
        }))
        throw err
      }
    },
  })

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!state.isSupported) {
        throw new Error("Push notifications are not supported")
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready

        // Get current subscription
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          // Unsubscribe from push
          await subscription.unsubscribe()

          // Remove from server
          await removeSubscription(subscription.endpoint)
        }

        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          subscription: null,
          isLoading: false,
        }))

        queryClient.invalidateQueries({ queryKey: PUSH_NOTIFICATIONS_QUERY_KEY })

        return true
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error")
        setState((prev) => ({
          ...prev,
          error: err,
          isLoading: false,
        }))
        throw err
      }
    },
  })

  const requestPermission = useCallback(() => {
    return requestPermissionMutation.mutateAsync()
  }, [requestPermissionMutation])

  const subscribe = useCallback(() => {
    return subscribeMutation.mutateAsync()
  }, [subscribeMutation])

  const unsubscribe = useCallback(() => {
    return unsubscribeMutation.mutateAsync()
  }, [unsubscribeMutation])

  return {
    ...state,
    isLoading:
      state.isLoading ||
      requestPermissionMutation.isPending ||
      subscribeMutation.isPending ||
      unsubscribeMutation.isPending,
    requestPermission,
    subscribe,
    unsubscribe,
    isAuthenticated: !!user,
  }
}
