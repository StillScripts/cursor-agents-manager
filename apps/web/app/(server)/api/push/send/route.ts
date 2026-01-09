import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT_EMAIL || "mailto:admin@example.com"

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export async function POST(request: NextRequest) {
  try {
    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        {
          error: "VAPID keys not configured",
          sent: 0,
          invalidEndpoints: [],
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { subscriptions, notification } = body

    if (!subscriptions || !Array.isArray(subscriptions)) {
      return NextResponse.json(
        { error: "Invalid subscriptions", sent: 0, invalidEndpoints: [] },
        { status: 400 }
      )
    }

    if (!notification) {
      return NextResponse.json(
        { error: "Invalid notification", sent: 0, invalidEndpoints: [] },
        { status: 400 }
      )
    }

    let sentCount = 0
    const invalidEndpoints: string[] = []

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        }

        await webpush.sendNotification(pushSubscription, JSON.stringify(notification))
        sentCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        console.error(
          `[Push API] Error sending to ${subscription.endpoint}:`,
          errorMessage
        )

        // Check if subscription is invalid (410 Gone, 404 Not Found, etc.)
        if (
          errorMessage.includes("410") ||
          errorMessage.includes("Gone") ||
          errorMessage.includes("404") ||
          errorMessage.includes("Not Found") ||
          errorMessage.includes("expired") ||
          errorMessage.includes("InvalidRegistration")
        ) {
          invalidEndpoints.push(subscription.endpoint)
        }
      }
    }

    return NextResponse.json({
      sent: sentCount,
      total: subscriptions.length,
      invalidEndpoints,
    })
  } catch (error) {
    console.error("[Push API] Error processing request:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        sent: 0,
        invalidEndpoints: [],
      },
      { status: 500 }
    )
  }
}
