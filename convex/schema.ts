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

  timeLogs: defineTable({
    userId: v.string(),
    agentId: v.string(),
    activityType: v.union(
      v.literal("task_creation"),
      v.literal("conversation_review")
    ),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["userId", "agentId"]),
})
