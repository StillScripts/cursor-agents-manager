import { v } from "convex/values"
import { internal } from "./_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server"
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

/**
 * Internal helper to delete all data for a user by userId.
 * This is extracted from deleteAccount to be reusable.
 */
async function deleteUserDataByUserId(ctx: any, userId: string) {
  // Delete all user's agents
  const agents = await ctx.db
    .query("agents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const agent of agents) {
    await ctx.db.delete(agent._id)
  }

  // Delete user's API keys
  const apiKeys = await ctx.db
    .query("apiKeys")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const apiKey of apiKeys) {
    await ctx.db.delete(apiKey._id)
  }

  // Delete user's branches
  const branches = await ctx.db
    .query("branches")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const branch of branches) {
    await ctx.db.delete(branch._id)
  }

  // Delete user's repositories
  const repositories = await ctx.db
    .query("repositories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const repo of repositories) {
    await ctx.db.delete(repo._id)
  }

  // Delete user's tasks
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const task of tasks) {
    await ctx.db.delete(task._id)
  }

  // Delete user's time logs
  const timeLogs = await ctx.db
    .query("timeLogs")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const timeLog of timeLogs) {
    await ctx.db.delete(timeLog._id)
  }

  // Delete user's conversations
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()
  for (const conversation of conversations) {
    await ctx.db.delete(conversation._id)
  }
}

/**
 * Internal mutation to delete a user by userId (used by cleanup actions)
 */
export const deleteUserByUserId = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await deleteUserDataByUserId(ctx, args.userId)
    return { success: true }
  },
})

/**
 * Internal query to find test accounts by email pattern
 * Finds all users with emails matching playwright-*@example.com pattern
 */
export const findTestAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Find all users with emails matching playwright-*@example.com pattern
    const allUsers = await (ctx.db as any).query("user").collect()

    // Filter to test accounts (playwright@example.com or playwright-*@example.com)
    return allUsers.filter((user: any) => {
      const email = user.email || ""
      return (
        email === "playwright@example.com" ||
        /^playwright-\d+@example\.com$/.test(email)
      )
    })
  },
})

/**
 * Internal action to clean up test accounts created by Playwright tests.
 * Deletes all accounts with emails matching the pattern: playwright-*@example.com
 *
 * This can be called via HTTP endpoint or scheduled job to clean up test data.
 *
 * Usage:
 * - HTTP: POST to /api/admin/cleanup-test-accounts (requires auth)
 * - Scheduled: Set up a Convex scheduled function to call this periodically
 * - Manual: Call from Convex dashboard or CLI
 */
export const cleanupTestAccounts = internalAction({
  args: {},
  handler: async (ctx) => {
    // Find all test accounts
    const testUsers = await ctx.runQuery(internal.users.findTestAccounts, {})

    const deletedCount = testUsers.length
    const errors: string[] = []

    // Delete each test account
    for (const user of testUsers) {
      try {
        await ctx.runMutation(internal.users.deleteUserByUserId, {
          userId: user._id,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push(`Failed to delete ${user.email}: ${errorMessage}`)
      }
    }

    return {
      success: true,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  },
})
