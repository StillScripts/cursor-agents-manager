import { NextResponse } from "next/server"

// VAPID public key - should be generated and stored in environment variables
// For production, generate using: npm install -g web-push && web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

export async function GET() {
  if (!VAPID_PUBLIC_KEY) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 500 }
    )
  }

  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY })
}
