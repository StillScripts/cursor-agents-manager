import { and, desc, eq, isNull } from "drizzle-orm"
import type { Agent as AgentSchema } from "@/lib/schema/user-schema"
import { agents } from "@/lib/schema/user-schema"
import type { Agent } from "@/lib/types"
import {
  createAgentMapping,
  deleteAgentMapping,
  ensureUserDatabase,
  getUserIdByAgentId,
} from "@/lib/user-db"

/**
 * Cache TTL (time-to-live) configuration based on agent status
 * Active agents (CREATING/RUNNING) need frequent updates
 * Finished agents rarely change, so cache longer
 */
const CACHE_TTL_MS = {
  CREATING: 2 * 60 * 1000, // 2 minutes
  RUNNING: 2 * 60 * 1000, // 2 minutes
  FINISHED: 24 * 60 * 60 * 1000, // 24 hours
  ERROR: 24 * 60 * 60 * 1000, // 24 hours
  EXPIRED: 24 * 60 * 60 * 1000, // 24 hours
} as const

/**
 * Check if a cached agent is stale and needs refreshing
 */
export function isAgentStale(
  agent: AgentSchema,
  forceRefresh = false
): boolean {
  if (forceRefresh) return true

  // If no cachedAt, consider it stale
  if (!agent.cachedAt) return true

  const now = Date.now()
  const cachedAt = agent.cachedAt.getTime()
  const ageMs = now - cachedAt

  const ttl = CACHE_TTL_MS[agent.status]
  return ageMs > ttl
}

/**
 * Convert API Agent response to database schema format
 */
export function apiAgentToDbAgent(
  apiAgent: Agent & { simulation?: boolean },
  userId: string,
  provider: "cursor" | "claude-code" = "cursor"
): Omit<AgentSchema, "id"> & { id: string } {
  return {
    id: apiAgent.id,
    userId,
    provider,
    name: apiAgent.name,
    status: apiAgent.status,
    sourceRepository: apiAgent.source.repository,
    sourceRef: apiAgent.source.ref || null,
    targetBranchName: apiAgent.target.branchName || null,
    targetUrl: apiAgent.target.url,
    targetPrUrl: apiAgent.target.prUrl || null,
    targetAutoCreatePr: apiAgent.target.autoCreatePr,
    model: null, // Model is not in the API response, set in request
    summary: apiAgent.summary || null,
    providerData: null,
    createdAt: new Date(apiAgent.createdAt),
    updatedAt: new Date(),
    cachedAt: new Date(),
    syncStatus: "synced",
    syncError: null,
    deletedAt: null,
  }
}

/**
 * Convert database agent to API format
 */
export function dbAgentToApiAgent(
  dbAgent: AgentSchema,
  simulation = false
): Agent & { simulation: boolean } {
  return {
    id: dbAgent.id,
    name: dbAgent.name,
    status: dbAgent.status,
    source: {
      repository: dbAgent.sourceRepository,
      ref: dbAgent.sourceRef || undefined,
    },
    target: {
      url: dbAgent.targetUrl || "",
      branchName: dbAgent.targetBranchName || undefined,
      prUrl: dbAgent.targetPrUrl || undefined,
      autoCreatePr: dbAgent.targetAutoCreatePr || false,
    },
    createdAt: dbAgent.createdAt.toISOString(),
    summary: dbAgent.summary || undefined,
    simulation,
  }
}

/**
 * Save or update an agent in the cache
 * Uses upsert (insert or update on conflict)
 * Also creates agent mapping in master database for webhook lookups
 */
export async function saveAgentToCache(
  apiAgent: Agent & { simulation?: boolean },
  userId: string,
  provider: "cursor" | "claude-code" = "cursor",
  model?: string
): Promise<AgentSchema> {
  const dbAgent = apiAgentToDbAgent(apiAgent, userId, provider)

  // Add model if provided (from request, not API response)
  if (model) {
    dbAgent.model = model
  }

  // Get user's database
  const userDb = await ensureUserDatabase(userId)

  try {
    // Try upsert if supported (Turso/LibSQL)
    const result = await (userDb.insert(agents).values(dbAgent) as any)
      .onConflictDoUpdate?.({
        target: agents.id,
        set: {
          name: dbAgent.name,
          status: dbAgent.status,
          sourceRef: dbAgent.sourceRef,
          targetBranchName: dbAgent.targetBranchName,
          targetPrUrl: dbAgent.targetPrUrl,
          summary: dbAgent.summary,
          updatedAt: new Date(),
          cachedAt: new Date(),
          syncStatus: "synced",
          syncError: null,
        },
      })
      ?.returning?.()

    // Create agent mapping in master database for webhook lookups
    try {
      await createAgentMapping(dbAgent.id, userId)
    } catch {
      // Ignore if mapping already exists
      console.debug(`Agent mapping already exists for ${dbAgent.id}`)
    }

    if (result) {
      return result[0]
    }

    // Fallback for test environments without upsert support
    await userDb.insert(agents).values(dbAgent)
    return dbAgent as AgentSchema
  } catch {
    // If insert fails (already exists), try update
    try {
      const result = await (
        userDb
          .update(agents)
          .set({
            name: dbAgent.name,
            status: dbAgent.status,
            sourceRef: dbAgent.sourceRef,
            targetBranchName: dbAgent.targetBranchName,
            targetPrUrl: dbAgent.targetPrUrl,
            summary: dbAgent.summary,
            updatedAt: new Date(),
            cachedAt: new Date(),
            syncStatus: "synced",
            syncError: null,
          })
          .where(eq(agents.id, dbAgent.id)) as any
      ).returning?.()

      return result ? result[0] : (dbAgent as AgentSchema)
    } catch {
      return dbAgent as AgentSchema
    }
  }
}

/**
 * Get a single agent from cache by ID
 * Returns null if not found or soft-deleted
 */
export async function getAgentFromCache(
  agentId: string,
  userId: string
): Promise<AgentSchema | null> {
  // Get user's database
  const userDb = await ensureUserDatabase(userId)

  const [agent] = await userDb
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.userId, userId),
        isNull(agents.deletedAt)
      )
    )
    .limit(1)

  return agent || null
}

/**
 * Get multiple agents from cache for a user
 * Supports filtering by status and limiting results
 */
export async function getAgentsFromCache(
  userId: string,
  options: {
    limit?: number
    status?: AgentSchema["status"]
    includeDeleted?: boolean
  } = {}
): Promise<AgentSchema[]> {
  const { limit = 10, status, includeDeleted = false } = options

  // Get user's database
  const userDb = await ensureUserDatabase(userId)

  const conditions = [eq(agents.userId, userId)]

  if (!includeDeleted) {
    conditions.push(isNull(agents.deletedAt))
  }

  if (status) {
    conditions.push(eq(agents.status, status))
  }

  try {
    // Try with full query builder support (Turso/LibSQL)
    const query = userDb
      .select()
      .from(agents)
      .where(and(...conditions))
      .orderBy(desc(agents.createdAt))

    const result = await (query as any).limit?.(limit)

    if (result) {
      return result
    }

    // Fallback for test environments without limit support
    const all = await query
    return all.slice(0, limit)
  } catch (error) {
    console.error("Error fetching agents from cache:", error)
    return []
  }
}

/**
 * Update an existing agent in the cache
 * Returns null if agent doesn't exist
 */
export async function updateAgentCache(
  agentId: string,
  userId: string,
  updates: Partial<AgentSchema>
): Promise<AgentSchema | null> {
  try {
    // Get user's database
    const userDb = await ensureUserDatabase(userId)

    const result = await (
      userDb
        .update(agents)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId))) as any
    ).returning?.()

    if (result) {
      return result[0] || null
    }

    // Fallback for test environments - fetch after update
    await userDb
      .update(agents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))

    return await getAgentFromCache(agentId, userId)
  } catch {
    return null
  }
}

/**
 * Mark an agent as stale (needs refresh)
 * Useful when we know data might have changed
 */
export async function markAgentStale(
  agentId: string,
  userId: string,
  error?: string
): Promise<void> {
  // Get user's database
  const userDb = await ensureUserDatabase(userId)

  await userDb
    .update(agents)
    .set({
      syncStatus: error ? "error" : "stale",
      syncError: error || null,
      updatedAt: new Date(),
    })
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
}

/**
 * Invalidate (soft delete) an agent from cache
 * Sets deletedAt timestamp instead of actually deleting
 * Also removes agent mapping from master database
 */
export async function invalidateAgentCache(
  agentId: string,
  userId: string
): Promise<void> {
  // Get user's database
  const userDb = await ensureUserDatabase(userId)

  await userDb
    .update(agents)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))

  // Remove agent mapping from master database
  try {
    await deleteAgentMapping(agentId)
  } catch (error) {
    console.error(`Failed to delete agent mapping for ${agentId}:`, error)
    // Continue even if mapping deletion fails
  }
}

/**
 * Hard delete an agent from cache
 * Permanently removes the record (use sparingly)
 * Also removes agent mapping from master database
 */
export async function deleteAgentFromCache(
  agentId: string,
  userId: string
): Promise<void> {
  // Get user's database
  const userDb = await ensureUserDatabase(userId)

  await userDb
    .delete(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))

  // Remove agent mapping from master database
  try {
    await deleteAgentMapping(agentId)
  } catch (error) {
    console.error(`Failed to delete agent mapping for ${agentId}:`, error)
    // Continue even if mapping deletion fails
  }
}

/**
 * Batch save multiple agents to cache
 * More efficient than individual saves
 */
export async function batchSaveAgentsToCache(
  apiAgents: Array<Agent & { simulation?: boolean }>,
  userId: string,
  provider: "cursor" | "claude-code" = "cursor"
): Promise<AgentSchema[]> {
  if (apiAgents.length === 0) return []

  const dbAgents = apiAgents.map((apiAgent) =>
    apiAgentToDbAgent(apiAgent, userId, provider)
  )

  // Insert all, updating on conflict
  const results: AgentSchema[] = []

  for (const dbAgent of dbAgents) {
    const saved = await saveAgentToCache(
      {
        id: dbAgent.id,
        name: dbAgent.name,
        status: dbAgent.status,
        source: {
          repository: dbAgent.sourceRepository,
          ref: dbAgent.sourceRef || undefined,
        },
        target: {
          url: dbAgent.targetUrl || "",
          branchName: dbAgent.targetBranchName || undefined,
          prUrl: dbAgent.targetPrUrl || undefined,
          autoCreatePr: dbAgent.targetAutoCreatePr || false,
        },
        createdAt: dbAgent.createdAt.toISOString(),
        summary: dbAgent.summary || undefined,
      },
      userId,
      provider,
      dbAgent.model || undefined
    )
    results.push(saved)
  }

  return results
}

/**
 * Get agents that need refresh based on staleness
 */
export async function getStaleAgents(
  userId: string,
  forceRefresh = false
): Promise<AgentSchema[]> {
  const allAgents = await getAgentsFromCache(userId, { limit: 100 })

  if (forceRefresh) {
    return allAgents
  }

  return allAgents.filter((agent) => isAgentStale(agent, forceRefresh))
}

/**
 * Update an agent by ID only (for webhook handlers)
 * Uses user_agents mapping to find userId, then updates in user's database
 * Returns null if agent not found (may have been deleted or not yet cached)
 */
export async function updateAgentByIdOnly(
  agentId: string,
  updates: Partial<AgentSchema>
): Promise<AgentSchema | null> {
  try {
    // Look up userId from user_agents mapping table
    const userId = await getUserIdByAgentId(agentId)

    if (!userId) {
      // Agent mapping not found - might be deleted or not yet cached
      return null
    }

    // Update using the existing updateAgentCache function
    return await updateAgentCache(agentId, userId, updates)
  } catch (error) {
    console.error(`Failed to update agent ${agentId}:`, error)
    return null
  }
}
