import crypto from "node:crypto"
import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import {
  cacheKeys,
  getCachedUserBranches,
  getCachedUserRepositories,
} from "@/lib/cache/user-data"
import { db } from "@/lib/db"
import { decryptData, encryptData } from "@/lib/db/encryption"
import { userApiKeys } from "@/lib/db/schema/auth-schema"
import { branches, repositories, timeLogs } from "@/lib/db/schema/user-schema"
import {
  createUserDatabase,
  ensureUserDatabase,
  getUserDatabase,
} from "@/lib/db/user-db"
import { type AuthVariables, requireAuth } from "@/lib/hono/middleware/auth"
import {
  apiKeySchema,
  branchesRequestSchema,
  repositoriesRequestSchema,
} from "@/lib/schemas/settings"

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

  if (!apiKey || !apiKey.encryptedCursorApiKey) {
    return c.json({ hasApiKey: false })
  }

  try {
    const decrypted = decryptData(apiKey.encryptedCursorApiKey)
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
app.post("/api-key", zValidator("json", apiKeySchema), async (c) => {
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
      await db
        .update(userApiKeys)
        .set({
          encryptedCursorApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(eq(userApiKeys.userId, user.id))
    } else {
      await db.insert(userApiKeys).values({
        id: crypto.randomUUID(),
        userId: user.id,
        encryptedCursorApiKey: encryptedKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return c.json({ success: true })
  } catch (error) {
    console.error("Error saving API key:", error)
    return c.json({ error: "Failed to save API key" }, 500)
  }
})

// DELETE /api/user/api-key - Delete API key
app.delete("/api-key", async (c) => {
  const user = c.get("user")

  try {
    await db
      .update(userApiKeys)
      .set({ encryptedCursorApiKey: null, updatedAt: new Date() })
      .where(eq(userApiKeys.userId, user.id))

    return c.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return c.json({ error: "Failed to delete API key" }, 500)
  }
})

// ============================================================================
// User Database Routes
// ============================================================================

// POST /api/user/create-database - Create user's database (idempotent)
app.post("/create-database", async (c) => {
  const user = c.get("user")

  try {
    // Try to get existing database first
    try {
      await getUserDatabase(user.id)
      // Database already exists
      return c.json({ success: true, message: "Database already exists" })
    } catch {
      // Database doesn't exist, create it
      const result = await createUserDatabase(user.id)
      return c.json({
        success: true,
        message: "Database created successfully",
        database: result,
      })
    }
  } catch (error) {
    console.error("Error creating user database:", error)
    return c.json(
      {
        error: "Failed to create database",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
})

// ============================================================================
// OpenAI API Key Routes
// ============================================================================

// GET /api/user/openai-api-key - Get OpenAI API key status (masked)
app.get("/openai-api-key", async (c) => {
  const user = c.get("user")

  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, user.id))
    .limit(1)

  if (!apiKey || !apiKey.encryptedOpenaiApiKey) {
    return c.json({ hasApiKey: false })
  }

  try {
    const decrypted = decryptData(apiKey.encryptedOpenaiApiKey)
    const masked = `${decrypted.substring(0, 8)}...${decrypted.substring(decrypted.length - 4)}`

    return c.json({
      hasApiKey: true,
      masked,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    })
  } catch (error) {
    console.error("Error decrypting OpenAI API key:", error)
    return c.json({ hasApiKey: false })
  }
})

// POST /api/user/openai-api-key - Save or update OpenAI API key
app.post("/openai-api-key", zValidator("json", apiKeySchema), async (c) => {
  const user = c.get("user")
  const { apiKey } = c.req.valid("json")

  const encryptedKey = encryptData(apiKey)

  try {
    // Check if user already has an API key record
    const [existing] = await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, user.id))
      .limit(1)

    if (existing) {
      await db
        .update(userApiKeys)
        .set({
          encryptedOpenaiApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(eq(userApiKeys.userId, user.id))
    } else {
      await db.insert(userApiKeys).values({
        id: crypto.randomUUID(),
        userId: user.id,
        encryptedOpenaiApiKey: encryptedKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return c.json({ success: true })
  } catch (error) {
    console.error("Error saving OpenAI API key:", error)
    return c.json({ error: "Failed to save OpenAI API key" }, 500)
  }
})

// DELETE /api/user/openai-api-key - Delete OpenAI API key
app.delete("/openai-api-key", async (c) => {
  const user = c.get("user")

  try {
    await db
      .update(userApiKeys)
      .set({ encryptedOpenaiApiKey: null, updatedAt: new Date() })
      .where(eq(userApiKeys.userId, user.id))

    return c.json({ success: true })
  } catch (error) {
    console.error("Error deleting OpenAI API key:", error)
    return c.json({ error: "Failed to delete OpenAI API key" }, 500)
  }
})

// ============================================================================
// Repository Routes
// ============================================================================

// GET /api/user/repositories - Get all repositories (cached for 1 day)
app.get("/repositories", async (c) => {
  const user = c.get("user")

  try {
    // Use cached function - cache lasts 1 day, invalidated on POST
    const userRepos = await getCachedUserRepositories(user.id)
    return c.json({ repositories: userRepos })
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return c.json({ error: "Failed to fetch repositories" }, 500)
  }
})

// POST /api/user/repositories - Save all repositories (replace existing)
app.post(
  "/repositories",
  zValidator("json", repositoriesRequestSchema),
  async (c) => {
    const user = c.get("user")
    const { repositories: repos } = c.req.valid("json")

    try {
      // Get user's database
      const userDb = await ensureUserDatabase(user.id)

      // Delete all repositories for the user and then insert new
      await userDb.delete(repositories).where(eq(repositories.userId, user.id))

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
          await userDb.insert(repositories).values(validRepos)
        }
      }

      // Invalidate the cache for this user's repositories
      try {
        revalidateTag(cacheKeys.userRepositories(user.id), "max")
      } catch {
        // Ignore errors in test environment where Next.js cache is not available
      }

      const updatedRepos = await userDb
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

// GET /api/user/branches - Get all branches (cached for 1 day)
app.get("/branches", async (c) => {
  const user = c.get("user")

  try {
    // Use cached function - cache lasts 1 day, invalidated on POST
    const userBranches = await getCachedUserBranches(user.id)
    return c.json({ branches: userBranches })
  } catch (error) {
    console.error("Error fetching branches:", error)
    return c.json({ error: "Failed to fetch branches" }, 500)
  }
})

// POST /api/user/branches - Save all branches (replace existing)
app.post("/branches", zValidator("json", branchesRequestSchema), async (c) => {
  const user = c.get("user")
  const { branches: branchList } = c.req.valid("json")

  try {
    // Get user's database
    const userDb = await ensureUserDatabase(user.id)

    // Delete all branches for the user and then insert new
    await userDb.delete(branches).where(eq(branches.userId, user.id))

    if (branchList.length > 0) {
      const validBranches = branchList
        .filter((b) => b.name?.trim())
        .map((b) => ({
          userId: user.id,
          name: b.name.trim(),
          createdAt: new Date(),
        }))

      if (validBranches.length > 0) {
        await userDb.insert(branches).values(validBranches)
      }
    }

    // Invalidate the cache for this user's branches
    try {
      revalidateTag(cacheKeys.userBranches(user.id), "max")
    } catch {
      // Ignore errors in test environment where Next.js cache is not available
    }

    const updatedBranches = await userDb
      .select()
      .from(branches)
      .where(eq(branches.userId, user.id))
      .orderBy(branches.createdAt)

    return c.json({ branches: updatedBranches })
  } catch (error) {
    console.error("Error saving branches:", error)
    return c.json({ error: "Failed to save branches" }, 500)
  }
})

// ============================================================================
// Time Log Routes
// ============================================================================

const timeLogSchema = z.object({
  taskId: z.string().min(1),
  activityType: z.enum(["task_creation", "conversation_review"]),
  startTime: z.number().int().positive(),
})

// POST /api/user/time-logs - Save a time log
app.post("/time-logs", zValidator("json", timeLogSchema), async (c) => {
  const user = c.get("user")
  const data = c.req.valid("json")

  try {
    // Get user's database
    const userDb = await ensureUserDatabase(user.id)

    await userDb.insert(timeLogs).values({
      userId: user.id,
      taskId: data.taskId,
      activityType: data.activityType,
      startTime: new Date(data.startTime),
      endTime: new Date(), // Server sets end time
      createdAt: new Date(),
    })

    return c.json({ success: true })
  } catch (error) {
    console.error("Error saving time log:", error)
    return c.json({ error: "Failed to save time log" }, 500)
  }
})

// GET /api/user/time-logs - Get time logs for a task (optional taskId query param)
app.get("/time-logs", async (c) => {
  const user = c.get("user")
  const taskId = c.req.query("taskId")

  try {
    // Get user's database
    const userDb = await ensureUserDatabase(user.id)

    const conditions = taskId
      ? and(eq(timeLogs.userId, user.id), eq(timeLogs.taskId, taskId))
      : eq(timeLogs.userId, user.id)

    const logs = await userDb
      .select()
      .from(timeLogs)
      .where(conditions)
      .orderBy(timeLogs.createdAt)

    return c.json({ timeLogs: logs })
  } catch (error) {
    console.error("Error fetching time logs:", error)
    return c.json({ error: "Failed to fetch time logs" }, 500)
  }
})

export { app as userApp }
