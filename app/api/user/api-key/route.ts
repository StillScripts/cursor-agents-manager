import crypto from "crypto"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { decryptData, encryptData } from "@/lib/encryption"
import { userApiKeys } from "@/lib/schema/auth-schema"

// Get API key status (don't return the actual key)
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, session.user.id))
    .limit(1)

  if (!apiKey || !apiKey.encryptedApiKey) {
    return NextResponse.json({ hasApiKey: false })
  }

  // Return masked version for display
  try {
    const decrypted = decryptData(apiKey.encryptedApiKey)
    const masked = `${decrypted.substring(0, 8)}...${decrypted.substring(decrypted.length - 4)}`

    return NextResponse.json({
      hasApiKey: true,
      masked,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    })
  } catch (error) {
    console.error("Error decrypting API key:", error)
    return NextResponse.json({ hasApiKey: false })
  }
}

// Save or update API key
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { apiKey } = body

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "API key required" }, { status: 400 })
  }

  // Validate API key format (basic check)
  if (apiKey.trim().length < 10) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 400 }
    )
  }

  const encryptedKey = encryptData(apiKey)

  try {
    // Check if user already has an API key
    const [existing] = await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, session.user.id))
      .limit(1)

    if (existing) {
      // Update existing
      await db
        .update(userApiKeys)
        .set({
          encryptedApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(eq(userApiKeys.userId, session.user.id))
    } else {
      // Insert new
      await db.insert(userApiKeys).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        encryptedApiKey: encryptedKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving API key:", error)
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    )
  }
}

// Delete API key
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await db
      .update(userApiKeys)
      .set({ encryptedApiKey: null, updatedAt: new Date() })
      .where(eq(userApiKeys.userId, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    )
  }
}
