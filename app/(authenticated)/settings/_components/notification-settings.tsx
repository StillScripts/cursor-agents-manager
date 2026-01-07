"use client"

import { Bell, BellOff, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { usePushNotifications } from "@/lib/hooks/use-push-notifications"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    isAuthenticated,
  } = usePushNotifications()

  if (!isAuthenticated) {
    return null
  }

  if (!isSupported) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <AlertDescription>
              Push notifications are not supported in this browser or environment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await subscribe()
      } else {
        await unsubscribe()
      }
    } catch (err) {
      console.error("Failed to toggle push notifications:", err)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time updates about your agents even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {permission === "default" && !isSubscribed && (
          <Alert>
            <AlertDescription>
              Click the button below to enable push notifications. You'll be asked
              to grant permission.
            </AlertDescription>
          </Alert>
        )}

        {permission === "denied" && (
          <Alert variant="destructive">
            <AlertDescription>
              Notification permission was denied. Please enable it in your browser
              settings to receive push notifications.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-sm font-medium">
              Enable Push Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? "You'll receive notifications about agent status changes"
                : "Turn on to receive real-time updates"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading || permission === "denied"}
            />
          </div>
        </div>

        {permission === "default" && !isSubscribed && (
          <Button
            onClick={() => subscribe()}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Enable Notifications
              </>
            )}
          </Button>
        )}

        {isSubscribed && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              ✓ Push notifications are enabled. You'll receive updates about your
              agents.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
