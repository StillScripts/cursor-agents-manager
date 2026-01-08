import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getTimeLogsByAgent = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .collect()

    return timeLogs.map((log) => ({
      _id: log._id,
      agentId: log.agentId,
      activityType: log.activityType,
      startTime: log.startTime,
      endTime: log.endTime,
      createdAt: log.createdAt,
    }))
  },
})

export const getAllTimeLogs = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    return timeLogs.map((log) => ({
      _id: log._id,
      agentId: log.agentId,
      activityType: log.activityType,
      startTime: log.startTime,
      endTime: log.endTime,
      createdAt: log.createdAt,
    }))
  },
})

export const saveTimeLog = mutation({
  args: {
    agentId: v.string(),
    activityType: v.union(
      v.literal("task_creation"),
      v.literal("conversation_review")
    ),
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const now = Date.now()
    await ctx.db.insert("timeLogs", {
      userId: authUser.userId,
      agentId: args.agentId,
      activityType: args.activityType,
      startTime: args.startTime,
      endTime: now,
      createdAt: now,
    })

    return { success: true }
  },
})
