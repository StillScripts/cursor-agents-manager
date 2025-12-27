import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { branches } from "@/lib/schema/user-schema"

// Get all branches for the current user
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userBranches = await db
      .select()
      .from(branches)
      .where(eq(branches.userId, session.user.id))
      .orderBy(branches.createdAt)

    return NextResponse.json({ branches: userBranches })
  } catch (error) {
    console.error("Error fetching branches:", error)
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    )
  }
}

// Save all branches (replace existing)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { branches: branchList } = body

    if (!Array.isArray(branchList)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    // Delete existing branches for this user
    await db.delete(branches).where(eq(branches.userId, session.user.id))

    // Insert new branches
    if (branchList.length > 0) {
      const validBranches = branchList
        .filter((b) => b.name?.trim())
        .map((b) => ({
          userId: session.user.id,
          name: b.name.trim(),
          createdAt: new Date(),
        }))

      if (validBranches.length > 0) {
        await db.insert(branches).values(validBranches)
      }
    }

    // Fetch updated branches
    const updatedBranches = await db
      .select()
      .from(branches)
      .where(eq(branches.userId, session.user.id))
      .orderBy(branches.createdAt)

    return NextResponse.json({ branches: updatedBranches })
  } catch (error) {
    console.error("Error saving branches:", error)
    return NextResponse.json(
      { error: "Failed to save branches" },
      { status: 500 }
    )
  }
}
