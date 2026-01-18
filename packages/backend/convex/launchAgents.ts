import { v } from "convex/values"
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server"
import { getAuthenticatedUser } from "./auth"
import { internal } from "./_generated/api"

/**
 * Create a launch agent record
 * This stores every agent launch request, including recurring job parameters if provided
 */
export const create = mutation({
  args: {
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
    recurringJob: v.optional(
      v.object({
        intervalDays: v.number(),
        repeatCount: v.number(),
      })
    ),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)
    const now = Date.now()

    // Calculate nextRunAt if this is a recurring job
    let nextRunAt: number | undefined
    let recurringJobData:
      | {
          intervalDays: number
          repeatCount: number
          currentCount: number
          isActive: boolean
        }
      | undefined

    if (args.recurringJob) {
      // For recurring jobs, schedule the next run after intervalDays
      // The first execution already happened, so we schedule the next one
      nextRunAt = now + args.recurringJob.intervalDays * 24 * 60 * 60 * 1000
      recurringJobData = {
        intervalDays: args.recurringJob.intervalDays,
        repeatCount: args.recurringJob.repeatCount,
        currentCount: 1, // Start at 1 since the first execution already happened
        isActive: true,
      }
    }

    const launchAgentId = await ctx.db.insert("launchAgents", {
      userId: authUser.userId,
      prompt: args.prompt,
      source: args.source,
      model: args.model,
      target: args.target,
      taskId: args.taskId,
      recurringJob: recurringJobData,
      nextRunAt,
      agentId: args.agentId,
      createdAt: now,
    })

    return { _id: launchAgentId }
  },
})

/**
 * Internal mutation to create a launch agent record
 * Used by recurring job execution to create new launch records
 */
export const createInternal = internalMutation({
  args: {
    userId: v.string(),
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
    recurringJob: v.optional(
      v.object({
        intervalDays: v.number(),
        repeatCount: v.number(),
        currentCount: v.number(),
        isActive: v.boolean(),
      })
    ),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Calculate nextRunAt if this is a recurring job
    let nextRunAt: number | undefined
    let recurringJobData:
      | {
          intervalDays: number
          repeatCount: number
          currentCount: number
          isActive: boolean
        }
      | undefined

    if (args.recurringJob) {
      // For recurring jobs, schedule the next run after intervalDays
      nextRunAt = now + args.recurringJob.intervalDays * 24 * 60 * 60 * 1000
      recurringJobData = args.recurringJob
    }

    const launchAgentId = await ctx.db.insert("launchAgents", {
      userId: args.userId,
      prompt: args.prompt,
      source: args.source,
      model: args.model,
      target: args.target,
      taskId: args.taskId,
      recurringJob: recurringJobData,
      nextRunAt,
      agentId: args.agentId,
      createdAt: now,
    })

    return { _id: launchAgentId }
  },
})

/**
 * Internal query to get all launch agents with recurring jobs that are due to run
 * Used by the scheduled job executor
 */
export const getLaunchAgentsDueToRun = internalQuery({
  args: {
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all launch agents where nextRunAt <= currentTime and has active recurring job
    const launchAgents = await ctx.db
      .query("launchAgents")
      .withIndex("by_next_run", (q) => q.lte("nextRunAt", args.currentTime))
      .filter((q) =>
        q.and(
          q.neq(q.field("recurringJob"), undefined),
          q.eq(q.field("recurringJob.isActive"), true)
        )
      )
      .collect()

    return launchAgents
  },
})

/**
 * Internal mutation to update a launch agent's recurring job after execution
 * Increments currentCount and updates nextRunAt if more executions remain
 */
export const updateLaunchAgentAfterExecution = internalMutation({
  args: {
    launchAgentId: v.id("launchAgents"),
  },
  handler: async (ctx, args) => {
    const launchAgent = await ctx.db.get(args.launchAgentId)
    if (!launchAgent || !launchAgent.recurringJob) {
      throw new Error(
        `Launch agent with recurring job not found: ${args.launchAgentId}`
      )
    }

    const newCount = launchAgent.recurringJob.currentCount + 1
    const now = Date.now()

    // Check if we've reached the repeat count
    if (newCount >= launchAgent.recurringJob.repeatCount) {
      // Job is complete, deactivate it
      await ctx.db.patch(args.launchAgentId, {
        recurringJob: {
          ...launchAgent.recurringJob,
          currentCount: newCount,
          isActive: false,
        },
        nextRunAt: undefined, // Clear nextRunAt when job is complete
      })
    } else {
      // Calculate next run time (intervalDays from now)
      const nextRunAt =
        now + launchAgent.recurringJob.intervalDays * 24 * 60 * 60 * 1000

      await ctx.db.patch(args.launchAgentId, {
        recurringJob: {
          ...launchAgent.recurringJob,
          currentCount: newCount,
        },
        nextRunAt,
      })
    }

    return { success: true, currentCount: newCount }
  },
})

/**
 * Internal query to get a launch agent by ID (used by executeLaunchAgent)
 */
export const getLaunchAgentByIdInternal = internalQuery({
  args: {
    launchAgentId: v.id("launchAgents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.launchAgentId)
  },
})

/**
 * Internal action to execute a recurring job from a launch agent
 * This launches a new agent using the stored configuration
 */
export const executeLaunchAgent = internalAction({
  args: {
    launchAgentId: v.id("launchAgents"),
  },
  handler: async (ctx, args) => {
    // Get the launch agent from the database
    const launchAgent = await ctx.runQuery(
      internal.launchAgents.getLaunchAgentByIdInternal,
      {
        launchAgentId: args.launchAgentId,
      }
    )

    if (!launchAgent) {
      throw new Error(`Launch agent not found: ${args.launchAgentId}`)
    }

    if (!launchAgent.recurringJob || !launchAgent.recurringJob.isActive) {
      throw new Error(
        `Launch agent recurring job is not active: ${args.launchAgentId}`
      )
    }

    // Launch the agent using the stored configuration
    const result = await ctx.runAction(internal.cursor.launchAgentForRecurringJob, {
      userId: launchAgent.userId,
      prompt: launchAgent.prompt,
      source: launchAgent.source,
      model: launchAgent.model,
      target: launchAgent.target,
      taskId: launchAgent.taskId,
    })

    // Create a new launch agent record for this execution
    await ctx.runMutation(internal.launchAgents.createInternal, {
      userId: launchAgent.userId,
      prompt: launchAgent.prompt,
      source: launchAgent.source,
      model: launchAgent.model,
      target: launchAgent.target,
      taskId: launchAgent.taskId,
      recurringJob: launchAgent.recurringJob,
      agentId: result.id,
    })

    // Update the original launch agent after launching
    await ctx.runMutation(internal.launchAgents.updateLaunchAgentAfterExecution, {
      launchAgentId: args.launchAgentId,
    })

    return { success: true, agentId: result.id }
  },
})

/**
 * Scheduled function to check and execute recurring jobs that are due
 * This is called by the cron job
 */
export const checkAndExecuteRecurringJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    const currentTime = Date.now()

    // Get all launch agents with recurring jobs that are due to run
    const launchAgentsDue = await ctx.runQuery(
      internal.launchAgents.getLaunchAgentsDueToRun,
      {
        currentTime,
      }
    )

    console.log(
      `[RecurringJobs] Found ${launchAgentsDue.length} launch agents with recurring jobs due to run`
    )

    // Execute each launch agent's recurring job
    for (const launchAgent of launchAgentsDue) {
      try {
        if (!launchAgent.recurringJob) continue

        console.log(
          `[RecurringJobs] Executing launch agent ${launchAgent._id} (count: ${launchAgent.recurringJob.currentCount + 1}/${launchAgent.recurringJob.repeatCount})`
        )
        await ctx.runAction(internal.launchAgents.executeLaunchAgent, {
          launchAgentId: launchAgent._id,
        })
      } catch (error) {
        console.error(
          `[RecurringJobs] Error executing launch agent ${launchAgent._id}:`,
          error
        )
        // Continue with other jobs even if one fails
      }
    }

    return { executed: launchAgentsDue.length }
  },
})
