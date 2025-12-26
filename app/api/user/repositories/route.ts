import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { repositories } from "@/lib/schema/user-schema"
import { eq } from "drizzle-orm"

// Get all repositories for the current user
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userRepos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.userId, session.user.id))
      .orderBy(repositories.createdAt)

    return NextResponse.json({ repositories: userRepos })
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 })
  }
}

// Save all repositories (replace existing)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { repositories: repos } = body

    if (!Array.isArray(repos)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Delete existing repositories for this user
    await db.delete(repositories).where(eq(repositories.userId, session.user.id))

    // Insert new repositories
    if (repos.length > 0) {
      const validRepos = repos
        .filter((r) => r.url && r.name && r.url.trim() && r.name.trim())
        .map((r) => ({
          userId: session.user.id,
          url: r.url.trim(),
          name: r.name.trim(),
          createdAt: new Date(),
        }))

      if (validRepos.length > 0) {
        await db.insert(repositories).values(validRepos)
      }
    }

    // Fetch updated repositories
    const updatedRepos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.userId, session.user.id))
      .orderBy(repositories.createdAt)

    return NextResponse.json({ repositories: updatedRepos })
  } catch (error) {
    console.error("Error saving repositories:", error)
    return NextResponse.json({ error: "Failed to save repositories" }, { status: 500 })
  }
}
