import { NextRequest, NextResponse } from "next/server"
import { fetchAuthMutation, isAuthenticated } from "@/lib/better-auth/auth-server"
import { api } from "@/convex/_generated/api"

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, userAgent } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      )
    }

    // Store subscription in Convex
    const result = await fetchAuthMutation(request, api.pushSubscriptions.subscribeToPush, {
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      userAgent: userAgent || request.headers.get("user-agent") || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
}
