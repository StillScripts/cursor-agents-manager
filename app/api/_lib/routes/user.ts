import crypto from "node:crypto"
import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { db } from "@/lib/db"
import { decryptData, encryptData } from "@/lib/encryption"
import { userApiKeys } from "@/lib/schema/auth-schema"
import { branches, repositories } from "@/lib/schema/user-schema"
import { type AuthVariables, requireAuth } from "../middleware/auth"

const app = new Hono<{ Variables: AuthVariables }>()

// All user routes require authentication
app.use("*", requireAuth)

// ============================================================================
// API Key Routes
// ============================================================================

// GET /api/user/api-key - Get API key status (masked)
app.get("/api-key", async (c) => {
  const user = c.get("user")

  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, user.id))
    .limit(1)

  if (!apiKey || !apiKey.encryptedApiKey) {
    return c.json({ hasApiKey: false })
  }

  try {
    const decrypted = decryptData(apiKey.encryptedApiKey)
    const masked = `${decrypted.substring(0, 8)}...${decrypted.substring(decrypted.length - 4)}`

    return c.json({
      hasApiKey: true,
      masked,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    })
  } catch (error) {
    console.error("Error decrypting API key:", error)
    return c.json({ hasApiKey: false })
  }
})

// POST /api/user/api-key - Save or update API key
app.post(
  "/api-key",
  zValidator(
    "json",
    z.object({
      apiKey: z.string().min(10, "API key must be at least 10 characters"),
    })
  ),
  async (c) => {
    const user = c.get("user")
    const { apiKey } = c.req.valid("json")

    const encryptedKey = encryptData(apiKey)

    try {
      // Check if user already has an API key
      const [existing] = await db
        .select()
        .from(userApiKeys)
        .where(eq(userApiKeys.userId, user.id))
        .limit(1)

      if (existing) {
        // Update existing
        await db
          .update(userApiKeys)
          .set({
            encryptedApiKey: encryptedKey,
            updatedAt: new Date(),
          })
          .where(eq(userApiKeys.userId, user.id))
      } else {
        // Insert new
        await db.insert(userApiKeys).values({
          id: crypto.randomUUID(),
          userId: user.id,
          encryptedApiKey: encryptedKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      return c.json({ success: true })
    } catch (error) {
      console.error("Error saving API key:", error)
      return c.json({ error: "Failed to save API key" }, 500)
    }
  }
)

// DELETE /api/user/api-key - Delete API key
app.delete("/api-key", async (c) => {
  const user = c.get("user")

  try {
    await db
      .update(userApiKeys)
      .set({ encryptedApiKey: null, updatedAt: new Date() })
      .where(eq(userApiKeys.userId, user.id))

    return c.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return c.json({ error: "Failed to delete API key" }, 500)
  }
})

// ============================================================================
// Repository Routes
// ============================================================================

// GET /api/user/repositories - Get all repositories
app.get("/repositories", async (c) => {
  const user = c.get("user")

  try {
    const userRepos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.userId, user.id))
      .orderBy(repositories.createdAt)

    return c.json({ repositories: userRepos })
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return c.json({ error: "Failed to fetch repositories" }, 500)
  }
})

// POST /api/user/repositories - Save all repositories (replace existing)
app.post(
  "/repositories",
  zValidator(
    "json",
    z.object({
      repositories: z.array(
        z.object({
          url: z.string(),
          name: z.string(),
        })
      ),
    })
  ),
  async (c) => {
    const user = c.get("user")
    const { repositories: repos } = c.req.valid("json")

    try {
      // Delete existing repositories for this user
      await db.delete(repositories).where(eq(repositories.userId, user.id))

      // Insert new repositories
      if (repos.length > 0) {
        const validRepos = repos
          .filter((r) => r.url?.trim() && r.name?.trim())
          .map((r) => ({
            userId: user.id,
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
        .where(eq(repositories.userId, user.id))
        .orderBy(repositories.createdAt)

      return c.json({ repositories: updatedRepos })
    } catch (error) {
      console.error("Error saving repositories:", error)
      return c.json({ error: "Failed to save repositories" }, 500)
    }
  }
)

// ============================================================================
// Branch Routes
// ============================================================================

// GET /api/user/branches - Get all branches
app.get("/branches", async (c) => {
  const user = c.get("user")

  try {
    const userBranches = await db
      .select()
      .from(branches)
      .where(eq(branches.userId, user.id))
      .orderBy(branches.createdAt)

    return c.json({ branches: userBranches })
  } catch (error) {
    console.error("Error fetching branches:", error)
    return c.json({ error: "Failed to fetch branches" }, 500)
  }
})

// POST /api/user/branches - Save all branches (replace existing)
app.post(
  "/branches",
  zValidator(
    "json",
    z.object({
      branches: z.array(
        z.object({
          name: z.string(),
        })
      ),
    })
  ),
  async (c) => {
    const user = c.get("user")
    const { branches: branchList } = c.req.valid("json")

    try {
      // Delete existing branches for this user
      await db.delete(branches).where(eq(branches.userId, user.id))

      // Insert new branches
      if (branchList.length > 0) {
        const validBranches = branchList
          .filter((b) => b.name?.trim())
          .map((b) => ({
            userId: user.id,
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
        .where(eq(branches.userId, user.id))
        .orderBy(branches.createdAt)

      return c.json({ branches: updatedBranches })
    } catch (error) {
      console.error("Error saving branches:", error)
      return c.json({ error: "Failed to save branches" }, 500)
    }
  }
)

export { app as userApp }
