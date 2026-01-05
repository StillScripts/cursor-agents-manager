import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

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
