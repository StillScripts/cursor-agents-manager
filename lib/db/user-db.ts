import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { decryptData, encryptData } from "@/lib/db/encryption"
import { userAgents, userDatabases } from "@/lib/db/schema/auth-schema"
import { tursoManager } from "@/lib/db/turso-manager"

/**
 * Get the Drizzle client for a user's database
 * @param userId The user ID
 * @returns Drizzle client connected to user's database
 * @throws Error if user database not found
 */
export async function getUserDatabase(userId: string) {
  // Query userDatabases table from master DB
  const [userDb] = await db
    .select()
    .from(userDatabases)
    .where(eq(userDatabases.userId, userId))
    .limit(1)

  if (!userDb) {
    throw new Error(`Database not found for user: ${userId}`)
  }

  // Decrypt auth token
  const authToken = decryptData(userDb.authToken)

  // Return Drizzle client for user's database
  return tursoManager.getUserDatabase(userDb.databaseUrl, authToken)
}

/**
 * Create a new database for a user
 * Stores connection info in master DB's userDatabases table
 * Handles case where database exists in Turso but not in local table
 * @param userId The user ID
 * @returns Database connection info
 * @throws Error if database creation fails
 */
export async function createUserDatabase(userId: string) {
  // Calculate expected database name (used as fallback if API doesn't return it)
  const expectedDbName = `user-${userId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`

  // Create database via Turso API (handles case where it already exists in Turso)
  const database = await tursoManager.createUserDatabase(userId)

  // Ensure we have a database name (fallback to expected name if missing)
  const dbName = database.name || expectedDbName
  if (!dbName) {
    throw new Error(`Database name is missing for user: ${userId}`)
  }

  // Create auth token for the database
  const authToken = await tursoManager.createDatabaseToken(dbName)

  // Initialize schema in user's database (safe to run multiple times)
  const dbUrl = `libsql://${database.hostname}`
  await tursoManager.initializeUserSchema(dbUrl, authToken)

  // Store connection info in master DB (encrypt auth token)
  const encryptedToken = encryptData(authToken)

  // Check if record already exists (upsert pattern)
  const [existing] = await db
    .select()
    .from(userDatabases)
    .where(eq(userDatabases.userId, userId))
    .limit(1)

  if (existing) {
    // Update existing record with new connection info
    await db
      .update(userDatabases)
      .set({
        databaseName: dbName,
        databaseUrl: dbUrl,
        authToken: encryptedToken,
        // Keep existing createdAt and id
      })
      .where(eq(userDatabases.userId, userId))
  } else {
    // Insert new record
    await db.insert(userDatabases).values({
      id: crypto.randomUUID(),
      userId,
      databaseName: dbName,
      databaseUrl: dbUrl,
      authToken: encryptedToken,
      createdAt: new Date(),
    })
  }

  return {
    databaseName: dbName,
    databaseUrl: dbUrl,
  }
}

/**
 * Ensure a user database exists, creating it if necessary
 * In test mode, returns the shared test database
 * @param userId The user ID
 * @returns Drizzle client connected to user's database
 */
export async function ensureUserDatabase(userId: string) {
  // In test/development without proper Turso config, use shared database
  // This allows tests to run without creating actual Turso databases
  const isTestMode =
    process.env.NODE_ENV === "test" ||
    !process.env.TURSO_ORG_NAME ||
    !process.env.TURSO_API_TOKEN

  if (isTestMode) {
    return db
  }

  try {
    return await getUserDatabase(userId)
  } catch {
    // Database doesn't exist, create it
    await createUserDatabase(userId)
    return await getUserDatabase(userId)
  }
}

/**
 * Helper to run a callback with a user's database client
 * @param userId The user ID
 * @param callback Function to run with database client
 * @returns Result of callback
 */
export async function withUserDatabase<T>(
  userId: string,
  callback: (db: Awaited<ReturnType<typeof getUserDatabase>>) => Promise<T>
): Promise<T> {
  const userDb = await getUserDatabase(userId)
  return await callback(userDb)
}

/**
 * Get user ID from agent ID (for webhook lookups)
 * Queries the user_agents mapping table in master DB
 * @param agentId The agent ID from Cursor
 * @returns User ID or null if not found
 */
export async function getUserIdByAgentId(
  agentId: string
): Promise<string | null> {
  const [mapping] = await db
    .select()
    .from(userAgents)
    .where(eq(userAgents.id, agentId))
    .limit(1)

  return mapping?.userId || null
}

/**
 * Create agent ID → user ID mapping in master DB
 * Call this when creating a new agent in user's database
 * @param agentId The agent ID from Cursor
 * @param userId The user ID
 */
export async function createAgentMapping(agentId: string, userId: string) {
  await db.insert(userAgents).values({
    id: agentId,
    userId,
    createdAt: new Date(),
  })
}

/**
 * Delete agent ID → user ID mapping from master DB
 * Call this when deleting an agent from user's database
 * @param agentId The agent ID to remove
 */
export async function deleteAgentMapping(agentId: string) {
  await db.delete(userAgents).where(eq(userAgents.id, agentId))
}
