"use client"

import { usePushNotifications } from "@/lib/hooks/use-push-notifications"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Bell, BellOff } from "lucide-react"
import { useEffect, useState } from "react"

export function PushNotificationsToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    requestPermission,
  } = usePushNotifications()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-subscribe if permission is granted but not subscribed
  useEffect(() => {
    if (isSupported && permission === "granted" && !isSubscribed && !isLoading) {
      const autoSubscribe = async () => {
        setIsLoading(true)
        setError(null)
        try {
          await subscribe()
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to enable notifications")
        } finally {
          setIsLoading(false)
        }
      }
      autoSubscribe()
    }
  }, [isSupported, permission, isSubscribed, subscribe, isLoading])

  const handleToggle = async (enabled: boolean) => {
    setIsLoading(true)
    setError(null)

    try {
      if (enabled) {
        // Request permission first if needed
        if (permission !== "granted") {
          const granted = await requestPermission()
          if (!granted) {
            setError("Notification permission denied")
            setIsLoading(false)
            return
          }
        }

        // Subscribe
        const success = await subscribe()
        if (!success) {
          setError("Failed to enable push notifications")
        }
      } else {
        // Unsubscribe
        const success = await unsubscribe()
        if (!success) {
          setError("Failed to disable push notifications")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Push Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Not supported in this browser
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const isEnabled = isSubscribed && permission === "granted"
  const isBlocked = permission === "denied"

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h3 className="font-medium">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {isBlocked
                ? "Permission denied. Enable in browser settings."
                : isEnabled
                  ? "You'll receive notifications when agents are updated"
                  : "Get notified when your agents are updated"}
            </p>
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Can't programmatically request again, show instructions
                alert(
                  "Please enable notifications in your browser settings and refresh the page."
                )
              }}
            >
              Enable in Settings
            </Button>
          ) : (
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading || isBlocked}
            />
          )}
        </div>
      </div>
    </Card>
  )
}
