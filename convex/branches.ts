import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getBranches = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const branches = await ctx.db
      .query("branches")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    return branches.map((b) => ({
      name: b.name,
    }))
  },
})

export const saveBranches = mutation({
  args: {
    branches: v.array(
      v.object({
        name: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const existing = await ctx.db
      .query("branches")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    for (const branch of existing) {
      await ctx.db.delete(branch._id)
    }

    const now = Date.now()
    for (const branch of args.branches) {
      await ctx.db.insert("branches", {
        userId: authUser.userId,
        name: branch.name,
        createdAt: now,
      })
    }

    return args.branches
  },
})
