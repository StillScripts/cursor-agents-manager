import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  agents: defineTable({
    // External ID from Cursor (e.g., bc-109be4f0-c6b3-4112-8a2e-4ef48e65486d)
    agentId: v.string(),
    userId: v.string(),
    provider: v.union(v.literal("cursor"), v.literal("claude-code")),

    // Link to a task if the user has associated it with a task
    taskId: v.optional(v.id("tasks")),

    // Agent metadata
    name: v.string(),
    status: v.union(
      v.literal("CREATING"),
      v.literal("RUNNING"),
      v.literal("FINISHED"),
      v.literal("ERROR"),
      v.literal("EXPIRED")
    ),
    model: v.optional(v.string()),
    summary: v.optional(v.string()),
    audioSummary: v.optional(v.string()), // Base64 encoded audio data
    sourceRepository: v.string(),
    sourceRef: v.optional(v.string()),
    targetBranchName: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    targetPrUrl: v.optional(v.string()),
    targetAutoCreatePr: v.optional(v.boolean()),
    providerData: v.optional(v.any()),

    // Data related to syncing and updates
    syncStatus: v.optional(
      v.union(v.literal("synced"), v.literal("stale"), v.literal("error"))
    ),
    syncError: v.optional(v.string()),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_agent", ["userId", "agentId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_agent_id", ["agentId"])
    .index("by_task", ["taskId"]),

  apiKeys: defineTable({
    userId: v.string(),
    encryptedCursorApiKey: v.string(),
    encryptedOpenaiApiKey: v.string(),
  }).index("by_user", ["userId"]),

  branches: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  repositories: defineTable({
    userId: v.string(),
    url: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  timeLogs: defineTable({
    userId: v.string(),
    taskId: v.id("tasks"),
    activityType: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_task", ["taskId"])
    .index("by_user_task", ["userId", "taskId"])
    .index("by_user_created", ["userId", "createdAt"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
})
