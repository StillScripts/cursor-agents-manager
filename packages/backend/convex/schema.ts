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
    repositoryUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  timeLogs: defineTable({
    userId: v.string(),
    taskId: v.id("tasks"),
    activityType: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()), // Optional - null means task is ongoing
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_task", ["taskId"])
    .index("by_user_task", ["userId", "taskId"])
    .index("by_user_created", ["userId", "createdAt"]),

  conversations: defineTable({
    // External agent ID from Cursor (e.g., bc-109be4f0-c6b3-4112-8a2e-4ef48e65486d)
    agentId: v.string(),
    userId: v.string(),
    // Conversation ID from Cursor API (usually same as agentId)
    conversationId: v.string(),
    // Array of messages matching Cursor API format
    messages: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("user_message"),
          v.literal("assistant_message"),
          v.literal("tool_call"),
          v.literal("tool_result")
        ),
        text: v.optional(v.string()),
        toolName: v.optional(v.string()),
        toolInput: v.optional(v.any()),
        toolResult: v.optional(v.string()),
      })
    ),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_user_agent", ["userId", "agentId"])
    .index("by_conversation", ["conversationId"]),

  launchAgents: defineTable({
    userId: v.string(),
    // Agent configuration for launching
    prompt: v.object({
      text: v.string(),
      images: v.optional(
        v.array(
          v.object({
            data: v.string(),
            dimension: v.object({
              width: v.number(),
              height: v.number(),
            }),
          })
        )
      ),
    }),
    source: v.object({
      repository: v.string(),
      ref: v.optional(v.string()),
    }),
    model: v.optional(v.string()),
    target: v.optional(
      v.object({
        autoCreatePr: v.boolean(),
        openAsCursorGithubApp: v.optional(v.boolean()),
        skipReviewerRequest: v.optional(v.boolean()),
        branchName: v.optional(v.string()),
      })
    ),
    taskId: v.optional(v.id("tasks")),
    // Recurring job parameters (only present if this is a recurring job)
    recurringJob: v.optional(
      v.object({
        // Interval in days between executions
        intervalDays: v.number(),
        // Total number of times to repeat (including the first execution)
        repeatCount: v.number(),
        // Current execution count (starts at 1, increments after each execution)
        currentCount: v.number(),
        // Whether the job is active (false when completed or cancelled)
        isActive: v.boolean(),
      })
    ),
    // Next scheduled execution time (milliseconds since epoch)
    // Only set for recurring jobs, null otherwise
    nextRunAt: v.optional(v.number()),
    // The agent ID that was created from this launch (if successful)
    agentId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_next_run", ["nextRunAt"])
    .index("by_user_created", ["userId", "createdAt"]),
})
