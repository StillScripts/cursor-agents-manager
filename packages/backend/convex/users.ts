import { mutation } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

/**
 * Deletes the authenticated user's account and all associated data.
 * This is a destructive operation that cannot be undone.
 *
 * Deletes:
 * - All agents
 * - API keys
 * - Branches
 * - Repositories
 * - Tasks
 * - Time logs
 * - Conversations
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx)

    // Delete all user's agents
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const agent of agents) {
      await ctx.db.delete(agent._id)
    }

    // Delete user's API keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const apiKey of apiKeys) {
      await ctx.db.delete(apiKey._id)
    }

    // Delete user's branches
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const branch of branches) {
      await ctx.db.delete(branch._id)
    }

    // Delete user's repositories
    const repositories = await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const repo of repositories) {
      await ctx.db.delete(repo._id)
    }

    // Delete user's tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const task of tasks) {
      await ctx.db.delete(task._id)
    }

    // Delete user's time logs
    const timeLogs = await ctx.db
      .query("timeLogs")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const timeLog of timeLogs) {
      await ctx.db.delete(timeLog._id)
    }

    // Delete user's conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()
    for (const conversation of conversations) {
      await ctx.db.delete(conversation._id)
    }

    return { success: true }
  },
})
