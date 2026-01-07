# Push Notification Implementation Guide

This document describes the push notification implementation for the Cursor Agent Manager PWA.

## Overview

The push notification system allows users to receive real-time updates about their agents even when the app is not actively open. The implementation uses the Web Push API with VAPID (Voluntary Application Server Identification) for secure push notifications.

## Architecture

### Components

1. **Service Worker** (`public/sw.js`)
   - Handles incoming push notifications
   - Displays notifications to users
   - Manages notification click events

2. **Convex Database Schema** (`convex/schema.ts`)
   - `pushSubscriptions` table stores user push subscription endpoints and keys

3. **Convex Functions**
   - `convex/pushSubscriptions.ts` - Manages push subscriptions (subscribe, unsubscribe, list)
   - `convex/pushNotifications.ts` - Sends push notifications via Convex actions

4. **API Routes**
   - `/api/push/vapid-public-key` - Returns VAPID public key for client-side subscription
   - `/api/push/subscribe` - Saves push subscription to database
   - `/api/push/unsubscribe` - Removes push subscription from database

5. **React Hooks**
   - `lib/hooks/use-push-notifications.ts` - Manages push notification subscription state
   - `lib/push-notifications.ts` - Client-side utilities for sending notifications

6. **UI Components**
   - `app/(authenticated)/settings/_components/notification-settings.tsx` - Settings UI for push notifications

## Setup Instructions

### 1. Generate VAPID Keys

VAPID keys are required for push notifications. Generate them using the `web-push` package:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output:
- Public Key (VAPID Public Key)
- Private Key (VAPID Private Key)

### 2. Configure Environment Variables

Add the following environment variables:

**Next.js Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
```

**Convex Environment Variables** (set in Convex dashboard):
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:your-email@example.com
```

**Note**: The `VAPID_SUBJECT` should be either:
- A `mailto:` URL (e.g., `mailto:admin@example.com`)
- An `https:` URL (e.g., `https://your-app.com`)

### 3. Install Dependencies

Add `web-push` to your Convex dependencies. Since Convex actions run in Node.js, you need to add it to your `package.json`:

```bash
bun add web-push
```

**Important**: The `web-push` package must be installed in the Convex environment. If you're using Convex's managed hosting, ensure the package is listed in your `package.json` dependencies.

### 4. Deploy Schema Changes

After adding the `pushSubscriptions` table to your schema, deploy the changes:

```bash
bun run convex:deploy
# or
npx convex deploy
```

## Usage

### User Flow

1. **User enables push notifications**:
   - Navigate to Settings page
   - Toggle "Enable Push Notifications"
   - Browser prompts for permission
   - If granted, subscription is saved to database

2. **Receiving notifications**:
   - Service worker receives push event
   - Notification is displayed to user
   - User can click notification to open app

3. **User disables push notifications**:
   - Toggle off in Settings
   - Subscription is removed from database and browser

### Sending Notifications

#### From Convex Actions

Use the Convex actions to send notifications:

```typescript
import { api } from "@/convex/_generated/api"
import { useMutation } from "@tanstack/react-query"
import { useConvex } from "convex/react"

function MyComponent() {
  const convex = useConvex()
  
  const sendNotification = useMutation({
    mutationFn: async () => {
      return await convex.mutation(api.pushNotifications.sendPushNotification, {
        payload: {
          title: "Hello",
          body: "This is a test notification",
          url: "/",
        },
      })
    },
  })
  
  // Send agent status notification
  const sendAgentNotification = useMutation({
    mutationFn: async () => {
      return await convex.mutation(
        api.pushNotifications.sendAgentStatusNotification,
        {
          agentId: "agent-123",
          agentName: "My Agent",
          status: "FINISHED",
        }
      )
    },
  })
}
```

#### From Server-Side Code

If you need to send notifications from server-side code (e.g., webhooks), you can call the Convex action:

```typescript
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
// Set auth if needed
client.setAuth(authToken)

await client.mutation(api.pushNotifications.sendAgentStatusNotification, {
  agentId: "agent-123",
  agentName: "My Agent",
  status: "FINISHED",
})
```

## Notification Payload Structure

```typescript
interface PushNotificationPayload {
  title: string                    // Notification title
  body: string                     // Notification body text
  icon?: string                    // Icon URL (defaults to app icon)
  badge?: string                   // Badge icon URL
  tag?: string                     // Tag for grouping notifications
  requireInteraction?: boolean     // Whether notification requires user interaction
  data?: Record<string, unknown>   // Custom data payload
  url?: string                     // URL to open when notification is clicked
  actions?: Array<{                // Action buttons
    action: string
    title: string
    icon?: string
  }>
}
```

## Browser Support

Push notifications are supported in:
- Chrome/Edge (Android & Desktop)
- Firefox (Android & Desktop)
- Safari (iOS 16.4+ and macOS)
- Opera

**Note**: Safari on iOS requires the app to be installed as a PWA (added to home screen).

## Testing

### Local Testing

1. **Generate test VAPID keys** (see Setup Instructions above)

2. **Start development server**:
   ```bash
   bun run dev
   ```

3. **Test subscription**:
   - Open app in browser
   - Navigate to Settings
   - Enable push notifications
   - Check browser console for subscription details

4. **Test sending notifications**:
   - Use browser DevTools > Application > Service Workers
   - Click "Push" to send a test notification
   - Or use the Convex dashboard to call the action

### Production Testing

1. Ensure VAPID keys are set in production environment
2. Test on actual devices (mobile and desktop)
3. Verify notifications work when app is closed
4. Test notification click behavior

## Troubleshooting

### Notifications Not Appearing

1. **Check browser permissions**:
   - Ensure notifications are allowed in browser settings
   - Check if permission was denied

2. **Check service worker**:
   - Verify service worker is registered
   - Check service worker console for errors

3. **Check VAPID keys**:
   - Ensure keys are correctly set in environment variables
   - Verify public key matches private key

4. **Check subscription**:
   - Verify subscription is saved in database
   - Check subscription endpoint is valid

### Subscription Fails

1. **Check browser support**:
   - Ensure browser supports Push API
   - Check if HTTPS is required (required for production)

2. **Check VAPID public key**:
   - Verify `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set
   - Check API route returns correct key

3. **Check authentication**:
   - Ensure user is authenticated
   - Verify API routes have proper auth

### Notifications Not Sending

1. **Check Convex action**:
   - Verify `web-push` is installed
   - Check Convex logs for errors

2. **Check VAPID keys in Convex**:
   - Ensure `VAPID_PRIVATE_KEY` is set in Convex environment
   - Verify `VAPID_SUBJECT` is set

3. **Check subscription validity**:
   - Old subscriptions may expire
   - System automatically removes invalid subscriptions

## Security Considerations

1. **VAPID Private Key**: Never expose the private key in client-side code. Only the public key should be in `NEXT_PUBLIC_*` variables.

2. **Subscription Endpoints**: Subscription endpoints are user-specific and should only be accessible by the authenticated user.

3. **Notification Content**: Be careful not to include sensitive information in notification payloads, as they may be logged or cached.

4. **Rate Limiting**: Consider implementing rate limiting for notification sending to prevent abuse.

## Future Enhancements

- [ ] Notification preferences (per-agent, per-event type)
- [ ] Rich notifications with images
- [ ] Notification actions (e.g., "View", "Dismiss")
- [ ] Notification grouping
- [ ] Silent notifications for background sync
- [ ] Notification analytics

## References

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
