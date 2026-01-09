import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getTimeLogsByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    // Verify task belongs to user
    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== authUser.userId) {
      return []
    }

    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect()

    return timeLogs.map((log) => ({
      _id: log._id,
      taskId: log.taskId,
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
      .order("desc")
      .collect()

    return timeLogs.map((log) => ({
      _id: log._id,
      taskId: log.taskId,
      activityType: log.activityType,
      startTime: log.startTime,
      endTime: log.endTime,
      createdAt: log.createdAt,
    }))
  },
})

export const getTodayTimeLogs = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .order("desc")
      .collect()

    return timeLogs
      .filter((log) => log.startTime >= todayStart)
      .map((log) => ({
        _id: log._id,
        taskId: log.taskId,
        activityType: log.activityType,
        startTime: log.startTime,
        endTime: log.endTime,
        createdAt: log.createdAt,
      }))
  },
})

export const saveTimeLog = mutation({
  args: {
    taskId: v.id("tasks"),
    startTime: v.number(),
    endTime: v.number(),
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    // Verify task belongs to user
    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== authUser.userId) {
      throw new Error("Task not found or unauthorized")
    }

    const now = Date.now()
    const timeLogId = await ctx.db.insert("timeLogs", {
      userId: authUser.userId,
      taskId: args.taskId,
      activityType: args.activityType,
      startTime: args.startTime,
      endTime: args.endTime,
      createdAt: now,
    })

    return timeLogId
  },
})

export const deleteTimeLog = mutation({
  args: {
    timeLogId: v.id("timeLogs"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const timeLog = await ctx.db.get(args.timeLogId)
    if (!timeLog || timeLog.userId !== authUser.userId) {
      throw new Error("Time log not found or unauthorized")
    }

    await ctx.db.delete(args.timeLogId)

    return { success: true }
  },
})
