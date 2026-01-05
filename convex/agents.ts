import { v } from "convex/values"
import { internalQuery, mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

// Agent status validator used across queries and mutations
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
        await ctx.db.patch(existing._id, {
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
        })
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
      await ctx.db.patch(existing._id, {
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
      })

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
