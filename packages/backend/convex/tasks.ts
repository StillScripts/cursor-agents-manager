import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getTasks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return { tasks: [], total: 0, hasMore: false }
    }

    const limit = args.limit ?? 20

    // Get tasks for this user, ordered by createdAt descending
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .order("desc")
      .take(limit + 1) // Take one extra to check if there are more

    // Sort by createdAt descending (newest first)
    tasks.sort((a, b) => b.createdAt - a.createdAt)

    const hasMore = tasks.length > limit
    const tasksToReturn = hasMore ? tasks.slice(0, limit) : tasks

    return {
      tasks: tasksToReturn.map((task) => ({
        _id: task._id,
        title: task.title,
        description: task.description,
        repositoryId: task.repositoryId,
        createdAt: task.createdAt,
      })),
      total: tasksToReturn.length,
      hasMore,
    }
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
      repositoryId: task.repositoryId,
      createdAt: task.createdAt,
    }
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    repositoryId: v.optional(v.id("repositories")),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const now = Date.now()
    const taskId = await ctx.db.insert("tasks", {
      userId: authUser.userId,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      repositoryId: args.repositoryId,
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
