import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

export const getRepositories = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const repositories = await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    return repositories.map((r) => ({
      url: r.url,
      name: r.name,
    }))
  },
})

export const saveRepositories = mutation({
  args: {
    repositories: v.array(
      v.object({
        url: v.string(),
        name: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const existing = await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .collect()

    for (const repo of existing) {
      await ctx.db.delete(repo._id)
    }

    const now = Date.now()
    for (const repo of args.repositories) {
      await ctx.db.insert("repositories", {
        userId: authUser.userId,
        url: repo.url,
        name: repo.name,
        createdAt: now,
      })
    }

    return args.repositories
  },
})
