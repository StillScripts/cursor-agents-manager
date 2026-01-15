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

    // Only return completed time logs (with endTime)
    return timeLogs
      .filter((log) => log.endTime !== undefined)
      .map((log) => ({
        _id: log._id,
        taskId: log.taskId,
        activityType: log.activityType,
        startTime: log.startTime,
        endTime: log.endTime!,
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

    // Only return completed time logs (with endTime)
    return timeLogs
      .filter((log) => log.endTime !== undefined)
      .map((log) => ({
        _id: log._id,
        taskId: log.taskId,
        activityType: log.activityType,
        startTime: log.startTime,
        endTime: log.endTime!,
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

    // Only return completed time logs (with endTime) from today
    return timeLogs
      .filter((log) => log.startTime >= todayStart && log.endTime !== undefined)
      .map((log) => ({
        _id: log._id,
        taskId: log.taskId,
        activityType: log.activityType,
        startTime: log.startTime,
        endTime: log.endTime!,
        createdAt: log.createdAt,
      }))
  },
})

// Get the active (ongoing) time log for the user
export const getActiveTimeLog = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return null
    }

    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .order("desc")
      .collect()

    // Find the active time log (no endTime)
    const activeLog = timeLogs.find((log) => log.endTime === undefined)
    if (!activeLog) {
      return null
    }

    // Verify task still exists
    const task = await ctx.db.get(activeLog.taskId)
    if (!task) {
      return null
    }

    return {
      _id: activeLog._id,
      taskId: activeLog.taskId,
      activityType: activeLog.activityType,
      startTime: activeLog.startTime,
      createdAt: activeLog.createdAt,
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
      },
    }
  },
})

export const saveTimeLog = mutation({
  args: {
    taskId: v.id("tasks"),
    startTime: v.number(),
    endTime: v.optional(v.number()), // Optional - null means task is ongoing
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    // Verify task belongs to user
    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== authUser.userId) {
      throw new Error("Task not found or unauthorized")
    }

    // If creating an ongoing task (no endTime), check if user already has an active task
    if (args.endTime === undefined) {
      const timeLogs = await ctx.db
        .query("timeLogs")
        .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
        .order("desc")
        .collect()

      const activeLog = timeLogs.find((log) => log.endTime === undefined)
      if (activeLog) {
        throw new Error(
          "You already have an active task. Please stop it before starting a new one."
        )
      }
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

// Stop an active time log by setting its endTime
export const stopTimeLog = mutation({
  args: {
    timeLogId: v.id("timeLogs"),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const timeLog = await ctx.db.get(args.timeLogId)
    if (!timeLog || timeLog.userId !== authUser.userId) {
      throw new Error("Time log not found or unauthorized")
    }

    // Only allow stopping if it's currently active (no endTime)
    if (timeLog.endTime !== undefined) {
      throw new Error("Time log is already completed")
    }

    await ctx.db.patch(args.timeLogId, {
      endTime: args.endTime,
    })

    return { success: true }
  },
})

// Update the end time of a completed time log
export const updateTimeLogEndTime = mutation({
  args: {
    timeLogId: v.id("timeLogs"),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const timeLog = await ctx.db.get(args.timeLogId)
    if (!timeLog || timeLog.userId !== authUser.userId) {
      throw new Error("Time log not found or unauthorized")
    }

    // Validate that endTime is after startTime
    if (args.endTime <= timeLog.startTime) {
      throw new Error("End time must be after start time")
    }

    await ctx.db.patch(args.timeLogId, {
      endTime: args.endTime,
    })

    return { success: true }
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
