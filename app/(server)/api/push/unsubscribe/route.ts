import { NextRequest, NextResponse } from "next/server"
import { fetchAuthMutation, isAuthenticated } from "@/lib/better-auth/auth-server"
import { api } from "@/convex/_generated/api"

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, subscriptionId } = body

    // Remove subscription from Convex
    const result = await fetchAuthMutation(
      request,
      api.pushSubscriptions.unsubscribeFromPush,
      {
        endpoint,
        subscriptionId,
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    )
  }
}
