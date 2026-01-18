import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

/**
 * Get today's work summary for the authenticated user
 * Returns the summary for today (Brisbane timezone) or null if not found
 */
export const getTodayWorkSummary = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return null
    }

    // Calculate today's date in Brisbane timezone (UTC+10, no DST)
    const brisbaneOffsetMs = 10 * 60 * 60 * 1000
    const brisbaneNow = new Date(Date.now() + brisbaneOffsetMs)
    const todayString = brisbaneNow.toISOString().split("T")[0] // YYYY-MM-DD format

    // Query for today's work summary
    const workSummary = await ctx.db
      .query("workSummaries")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", authUser.userId).eq("day", todayString)
      )
      .first()

    if (!workSummary) {
      return null
    }

    return {
      _id: workSummary._id,
      day: workSummary.day,
      summary: workSummary.summary,
      createdAt: workSummary.createdAt,
    }
  },
})

/**
 * Internal mutation to create or update today's work summary
 * This should only be called by actions (like summarizeTodayWork)
 */
export const saveTodayWorkSummary = internalMutation({
  args: {
    userId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // Calculate today's date in Brisbane timezone (UTC+10, no DST)
    const brisbaneOffsetMs = 10 * 60 * 60 * 1000
    const brisbaneNow = new Date(Date.now() + brisbaneOffsetMs)
    const todayString = brisbaneNow.toISOString().split("T")[0] // YYYY-MM-DD format

    // Check if summary already exists for today
    const existingSummary = await ctx.db
      .query("workSummaries")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", args.userId).eq("day", todayString)
      )
      .first()

    const now = Date.now()

    if (existingSummary) {
      // Update existing summary
      await ctx.db.patch(existingSummary._id, {
        summary: args.summary,
        createdAt: now, // Update timestamp to reflect regeneration
      })
      return existingSummary._id
    }

    // Create new summary
    const summaryId = await ctx.db.insert("workSummaries", {
      userId: args.userId,
      day: todayString,
      summary: args.summary,
      createdAt: now,
    })

    return summaryId
  },
})
