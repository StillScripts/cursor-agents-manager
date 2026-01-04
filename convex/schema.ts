import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  repositories: defineTable({
    userId: v.string(),
    url: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  branches: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
})
