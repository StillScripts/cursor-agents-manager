import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getTasks = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .order("desc")
      .collect()

    return tasks.map((task) => ({
      _id: task._id,
      title: task.title,
      description: task.description,
      repositoryUrl: task.repositoryUrl,
      createdAt: task.createdAt,
    }))
  },
})

export const getTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return null
    }

    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== authUser.userId) {
      return null
    }

    return {
      _id: task._id,
      title: task.title,
      description: task.description,
      repositoryUrl: task.repositoryUrl,
      createdAt: task.createdAt,
    }
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const now = Date.now()
    const taskId = await ctx.db.insert("tasks", {
      userId: authUser.userId,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      repositoryUrl: args.repositoryUrl?.trim() || undefined,
      createdAt: now,
    })

    return taskId
  },
})

export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const task = await ctx.db.get(args.taskId)
    if (!task || task.userId !== authUser.userId) {
      throw new Error("Task not found or unauthorized")
    }

    // Delete all time logs for this task
    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect()

    for (const log of timeLogs) {
      await ctx.db.delete(log._id)
    }

    // Delete the task
    await ctx.db.delete(args.taskId)

    return { success: true }
  },
})
