import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

const agentStatusValidator = v.union(
  v.literal("CREATING"),
  v.literal("RUNNING"),
  v.literal("FINISHED"),
  v.literal("ERROR"),
  v.literal("EXPIRED")
)

/**
 * List all agents for the authenticated user
 */
export const listByUser = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return { agents: [], total: 0 }
    }

    const limit = args.limit ?? 20

    // Get agents for this user, ordered by updatedAt descending
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .order("desc")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(limit + 1) // Take one extra to check if there are more

    const hasMore = agents.length > limit
    const agentsToReturn = hasMore ? agents.slice(0, limit) : agents

    return {
      agents: agentsToReturn,
      total: agentsToReturn.length,
      hasMore,
    }
  },
})

/**
 * Internal query to list agents for a user (used by actions)
 */
export const listByUserInternal = internalQuery({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(limit)

    return agents
  },
})

/**
 * Internal mutation to batch upsert agents (used by actions)
 */
export const batchUpsert = mutation({
  args: {
    agents: v.array(
      v.object({
        agentId: v.string(),
        provider: v.union(v.literal("cursor"), v.literal("claude-code")),
        name: v.string(),
        status: agentStatusValidator,
        sourceRepository: v.string(),
        sourceRef: v.optional(v.string()),
        targetBranchName: v.optional(v.string()),
        targetUrl: v.optional(v.string()),
        targetPrUrl: v.optional(v.string()),
        targetAutoCreatePr: v.optional(v.boolean()),
        model: v.optional(v.string()),
        summary: v.optional(v.string()),
        providerData: v.optional(v.any()),
        createdAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)
    const now = Date.now()

    const results = []
    for (const agent of args.agents) {
      // Check if agent already exists for this user
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_user_agent", (q) =>
          q.eq("userId", authUser.userId).eq("agentId", agent.agentId)
        )
        .first()

      if (existing) {
        // Update existing agent
        // If summary is being updated, clear audioSummary since it's now stale
        const patchData: {
          name: string
          status: typeof agent.status
          sourceRepository: string
          sourceRef?: string
          targetBranchName?: string
          targetUrl?: string
          targetPrUrl?: string
          targetAutoCreatePr?: boolean
          model?: string
          summary?: string
          providerData?: any
          updatedAt: number
          syncStatus: "synced"
          syncError?: undefined
          audioSummary?: undefined
        } = {
          name: agent.name,
          status: agent.status,
          sourceRepository: agent.sourceRepository,
          sourceRef: agent.sourceRef,
          targetBranchName: agent.targetBranchName,
          targetUrl: agent.targetUrl,
          targetPrUrl: agent.targetPrUrl,
          targetAutoCreatePr: agent.targetAutoCreatePr,
          model: agent.model,
          summary: agent.summary,
          providerData: agent.providerData,
          updatedAt: now,
          syncStatus: "synced",
          syncError: undefined,
        }

        // If summary is being updated, clear audioSummary
        if (agent.summary !== undefined && agent.summary !== existing.summary) {
          patchData.audioSummary = undefined
        }

        await ctx.db.patch(existing._id, patchData)
        results.push({
          _id: existing._id,
          agentId: agent.agentId,
          updated: true,
        })
      } else {
        // Create new agent
        const id = await ctx.db.insert("agents", {
          agentId: agent.agentId,
          userId: authUser.userId,
          provider: agent.provider,
          name: agent.name,
          status: agent.status,
          sourceRepository: agent.sourceRepository,
          sourceRef: agent.sourceRef,
          targetBranchName: agent.targetBranchName,
          targetUrl: agent.targetUrl,
          targetPrUrl: agent.targetPrUrl,
          targetAutoCreatePr: agent.targetAutoCreatePr,
          model: agent.model,
          summary: agent.summary,
          providerData: agent.providerData,
          updatedAt: now,
          syncStatus: "synced",
        })
        results.push({ _id: id, agentId: agent.agentId, updated: false })
      }
    }

    return results
  },
})

/**
 * Internal query to get an agent by ID for a user (used by actions)
 */
export const getByIdInternal = internalQuery({
  args: {
    userId: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", args.userId).eq("agentId", args.agentId)
      )
      .first()

    return agent
  },
})

/**
 * Internal query to get an agent by agentId only (used by webhooks)
 */
export const getByAgentIdInternal = internalQuery({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first()

    return agent
  },
})

/**
 * Internal query to find agents created in the past day that are not finished
 * Used by the nightly sync job
 * 
 * Note: We use updatedAt to find recently created agents since new agents
 * have updatedAt set to their creation time. This also catches agents that
 * were recently updated, which is fine for syncing purposes.
 */
export const getAgentsNeedingSync = internalQuery({
  args: {
    sinceTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all agents updated/created in the past day using the index
    const allAgents = await ctx.db
      .query("agents")
      .withIndex("by_updated_at", (q) => q.gte("updatedAt", args.sinceTimestamp))
      .collect()

    // Filter for agents that:
    // 1. Are not deleted
    // 2. Are not finished
    // 3. Are cursor agents
    const agentsNeedingSync = allAgents.filter(
      (agent) =>
        !agent.deletedAt &&
        agent.status !== "FINISHED" &&
        agent.provider === "cursor"
    )

    // Group by userId to batch API key lookups
    const agentsByUser = new Map<string, typeof agentsNeedingSync>()
    for (const agent of agentsNeedingSync) {
      const userAgents = agentsByUser.get(agent.userId) || []
      userAgents.push(agent)
      agentsByUser.set(agent.userId, userAgents)
    }

    return Array.from(agentsByUser.entries()).map(([userId, userAgents]) => ({
      userId,
      agents: userAgents,
    }))
  },
})

export const getById = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return null
    }

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first()

    return agent
  },
})

export const create = mutation({
  args: {
    agentId: v.string(),
    provider: v.union(v.literal("cursor"), v.literal("claude-code")),
    name: v.string(),
    status: v.union(
      v.literal("CREATING"),
      v.literal("RUNNING"),
      v.literal("FINISHED"),
      v.literal("ERROR"),
      v.literal("EXPIRED")
    ),
    sourceRepository: v.string(),
    sourceRef: v.optional(v.string()),
    targetBranchName: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    targetPrUrl: v.optional(v.string()),
    targetAutoCreatePr: v.optional(v.boolean()),
    model: v.optional(v.string()),
    summary: v.optional(v.string()),
    providerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    // Check if agent already exists for this user
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .first()

    if (existing) {
      // Update existing agent
      const now = Date.now()
      const patchData: {
        name: string
        status: typeof args.status
        sourceRepository: string
        sourceRef?: string
        targetBranchName?: string
        targetUrl?: string
        targetPrUrl?: string
        targetAutoCreatePr?: boolean
        model?: string
        summary?: string
        providerData?: any
        updatedAt: number
        syncStatus: "synced"
        syncError?: undefined
        audioSummary?: undefined
      } = {
        name: args.name,
        status: args.status,
        sourceRepository: args.sourceRepository,
        sourceRef: args.sourceRef,
        targetBranchName: args.targetBranchName,
        targetUrl: args.targetUrl,
        targetPrUrl: args.targetPrUrl,
        targetAutoCreatePr: args.targetAutoCreatePr,
        model: args.model,
        summary: args.summary,
        providerData: args.providerData,
        updatedAt: now,
        syncStatus: "synced",
        syncError: undefined,
      }

      // If summary is being updated, clear audioSummary
      if (args.summary !== undefined && args.summary !== existing.summary) {
        patchData.audioSummary = undefined
      }

      await ctx.db.patch(existing._id, patchData)

      return { _id: existing._id, agentId: args.agentId, updated: true }
    }

    // Create new agent
    const now = Date.now()
    const id = await ctx.db.insert("agents", {
      agentId: args.agentId,
      userId: authUser.userId,
      provider: args.provider,
      name: args.name,
      status: args.status,
      sourceRepository: args.sourceRepository,
      sourceRef: args.sourceRef,
      targetBranchName: args.targetBranchName,
      targetUrl: args.targetUrl,
      targetPrUrl: args.targetPrUrl,
      targetAutoCreatePr: args.targetAutoCreatePr,
      model: args.model,
      summary: args.summary,
      providerData: args.providerData,
      updatedAt: now,
      syncStatus: "synced",
    })

    return { _id: id, agentId: args.agentId, updated: false }
  },
})

/**
 * Update agent status
 */
export const updateStatus = mutation({
  args: {
    agentId: v.string(),
    status: agentStatusValidator,
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .first()

    if (!agent) {
      throw new Error("Agent not found")
    }

    await ctx.db.patch(agent._id, {
      status: args.status,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Soft delete an agent
 */
export const softDelete = mutation({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .first()

    if (!agent) {
      throw new Error("Agent not found")
    }

    await ctx.db.patch(agent._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update agent summary and audio summary
 */
export const updateSummary = mutation({
  args: {
    agentId: v.string(),
    summary: v.string(),
    audioSummary: v.optional(v.string()), // Base64 encoded audio data
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .first()

    if (!agent) {
      throw new Error("Agent not found")
    }

    const updates: {
      summary: string
      updatedAt: number
      audioSummary?: string
    } = {
      summary: args.summary,
      updatedAt: Date.now(),
    }

    // If audioSummary is provided, update it. If summary is being regenerated without audio,
    // we should clear the old audio (set to undefined)
    if (args.audioSummary !== undefined) {
      updates.audioSummary = args.audioSummary
    } else {
      // When summary is regenerated, clear old audio
      updates.audioSummary = undefined
    }

    await ctx.db.patch(agent._id, updates)

    return { success: true }
  },
})

/**
 * Internal mutation to update agent status (used by sync job)
 */
export const updateStatusInternal = internalMutation({
  args: {
    agentId: v.string(),
    status: agentStatusValidator,
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first()

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentId}`)
    }

    await ctx.db.patch(agent._id, {
      status: args.status,
      updatedAt: Date.now(),
      syncStatus: "synced",
      syncError: undefined,
    })

    return { success: true, agentId: args.agentId }
  },
})

/**
 * Internal mutation to update agent from sync job (used by nightly sync)
 */
export const updateFromSync = internalMutation({
  args: {
    agentId: v.string(),
    name: v.string(),
    status: agentStatusValidator,
    sourceRepository: v.string(),
    sourceRef: v.optional(v.string()),
    targetBranchName: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    targetPrUrl: v.optional(v.string()),
    targetAutoCreatePr: v.optional(v.boolean()),
    summary: v.optional(v.string()),
    providerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first()

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentId}`)
    }

    const now = Date.now()
    const patchData: {
      name: string
      status: typeof args.status
      sourceRepository: string
      sourceRef?: string
      targetBranchName?: string
      targetUrl?: string
      targetPrUrl?: string
      targetAutoCreatePr?: boolean
      summary?: string
      providerData?: any
      updatedAt: number
      syncStatus: "synced"
      syncError?: undefined
      audioSummary?: undefined
    } = {
      name: args.name,
      status: args.status,
      sourceRepository: args.sourceRepository,
      sourceRef: args.sourceRef,
      targetBranchName: args.targetBranchName,
      targetUrl: args.targetUrl,
      targetPrUrl: args.targetPrUrl,
      targetAutoCreatePr: args.targetAutoCreatePr,
      summary: args.summary,
      providerData: args.providerData,
      updatedAt: now,
      syncStatus: "synced",
      syncError: undefined,
    }

    // If summary is being updated, clear audioSummary since it's now stale
    if (args.summary !== undefined && args.summary !== agent.summary) {
      patchData.audioSummary = undefined
    }

    await ctx.db.patch(agent._id, patchData)

    return { success: true, agentId: args.agentId }
  },
})

/**
 * Internal mutation to update agent from webhook payload (used by webhooks)
 */
export const updateFromWebhook = internalMutation({
  args: {
    agentId: v.string(),
    status: agentStatusValidator,
    name: v.optional(v.string()),
    summary: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    targetBranchName: v.optional(v.string()),
    targetPrUrl: v.optional(v.string()),
    targetAutoCreatePr: v.optional(v.boolean()),
    sourceRepository: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first()

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentId}`)
    }

    const now = Date.now()
    const updates: {
      status: typeof args.status
      updatedAt: number
      syncStatus: "synced"
      syncError?: undefined
      name?: string
      summary?: string
      audioSummary?: undefined
      targetUrl?: string
      targetBranchName?: string
      targetPrUrl?: string
      targetAutoCreatePr?: boolean
      sourceRepository?: string
      sourceRef?: string
    } = {
      status: args.status,
      updatedAt: now,
      syncStatus: "synced",
      syncError: undefined,
    }

    // Only update fields that are provided
    if (args.name !== undefined) {
      updates.name = args.name
    }
    if (args.summary !== undefined) {
      updates.summary = args.summary
      // If summary is being updated, clear audioSummary since it's now stale
      updates.audioSummary = undefined
    }
    if (args.targetUrl !== undefined) {
      updates.targetUrl = args.targetUrl
    }
    if (args.targetBranchName !== undefined) {
      updates.targetBranchName = args.targetBranchName
    }
    if (args.targetPrUrl !== undefined) {
      updates.targetPrUrl = args.targetPrUrl
    }
    if (args.targetAutoCreatePr !== undefined) {
      updates.targetAutoCreatePr = args.targetAutoCreatePr
    }
    if (args.sourceRepository !== undefined) {
      updates.sourceRepository = args.sourceRepository
    }
    if (args.sourceRef !== undefined) {
      updates.sourceRef = args.sourceRef
    }

    await ctx.db.patch(agent._id, updates)

    return { success: true, agentId: args.agentId }
  },
})
