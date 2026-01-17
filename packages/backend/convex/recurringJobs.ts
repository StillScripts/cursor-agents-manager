import { v } from "convex/values"
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { getAuthenticatedUser } from "./auth"
import { internal } from "./_generated/api"

/**
 * Create a new recurring job
 */
export const create = mutation({
  args: {
    agentConfig: v.object({
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
    }),
    intervalDays: v.number(),
    repeatCount: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)
    const now = Date.now()

    // Calculate next run time (intervalDays from now)
    // The first execution already happened when the user launched the agent,
    // so we schedule the next one for intervalDays from now
    const nextRunAt = now + args.intervalDays * 24 * 60 * 60 * 1000

    const jobId = await ctx.db.insert("recurringJobs", {
      userId: authUser.userId,
      agentConfig: args.agentConfig,
      intervalDays: args.intervalDays,
      repeatCount: args.repeatCount,
      currentCount: 1, // Start at 1 since the first execution already happened
      nextRunAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    return { _id: jobId }
  },
})

/**
 * List all recurring jobs for the authenticated user
 */
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return []
    }

    const jobs = await ctx.db
      .query("recurringJobs")
      .withIndex("by_user", (q) => q.eq("userId", authUser.userId))
      .order("desc")
      .collect()

    return jobs
  },
})

/**
 * Get a recurring job by ID
 */
export const getById = query({
  args: {
    jobId: v.id("recurringJobs"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return null
    }

    const job = await ctx.db.get(args.jobId)
    if (!job || job.userId !== authUser.userId) {
      return null
    }

    return job
  },
})

/**
 * Cancel/deactivate a recurring job
 */
export const cancel = mutation({
  args: {
    jobId: v.id("recurringJobs"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx)

    const job = await ctx.db.get(args.jobId)
    if (!job || job.userId !== authUser.userId) {
      throw new Error("Recurring job not found")
    }

    await ctx.db.patch(args.jobId, {
      isActive: false,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Internal query to get all active recurring jobs that are due to run
 * Used by the scheduled job executor
 */
export const getJobsDueToRun = internalQuery({
  args: {
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all active jobs where nextRunAt <= currentTime
    const jobs = await ctx.db
      .query("recurringJobs")
      .withIndex("by_next_run", (q) => q.lte("nextRunAt", args.currentTime))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    return jobs
  },
})

/**
 * Internal mutation to update a recurring job after execution
 * Increments currentCount and updates nextRunAt if more executions remain
 */
export const updateAfterExecution = internalMutation({
  args: {
    jobId: v.id("recurringJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      throw new Error(`Recurring job not found: ${args.jobId}`)
    }

    const newCount = job.currentCount + 1
    const now = Date.now()

    // Check if we've reached the repeat count
    if (newCount >= job.repeatCount) {
      // Job is complete, deactivate it
      await ctx.db.patch(args.jobId, {
        currentCount: newCount,
        isActive: false,
        updatedAt: now,
      })
    } else {
      // Calculate next run time (intervalDays from now)
      const nextRunAt = now + job.intervalDays * 24 * 60 * 60 * 1000

      await ctx.db.patch(args.jobId, {
        currentCount: newCount,
        nextRunAt,
        updatedAt: now,
      })
    }

    return { success: true, currentCount: newCount }
  },
})

/**
 * Internal action to execute a recurring job
 * This launches a new agent using the stored configuration
 * Must be an action (not mutation) because it needs to call cursor.launchAgent action
 */
export const executeJob = internalAction({
  args: {
    jobId: v.id("recurringJobs"),
  },
  handler: async (ctx, args) => {
    // Get the job from the database
    const job = await ctx.runQuery(internal.recurringJobs.getJobByIdInternal, {
      jobId: args.jobId,
    })

    if (!job) {
      throw new Error(`Recurring job not found: ${args.jobId}`)
    }

    if (!job.isActive) {
      throw new Error(`Recurring job is not active: ${args.jobId}`)
    }

    // Launch the agent using the stored configuration
    // We need to call cursor.launchAgent action, but we need to authenticate as the user
    // Since we're in an internal action, we'll need to create a way to launch as a specific user
    // For now, let's use the launchAgent action directly - but we need to handle auth differently
    // Actually, we can't easily impersonate a user in an action
    // Let's create an internal action in cursor.ts that accepts userId

    // Launch the agent
    await ctx.runAction(internal.cursor.launchAgentForRecurringJob, {
      userId: job.userId,
      agentConfig: job.agentConfig,
    })

    // Update the job after launching
    await ctx.runMutation(internal.recurringJobs.updateAfterExecution, {
      jobId: args.jobId,
    })

    return { success: true }
  },
})

/**
 * Internal query to get a job by ID (used by executeJob)
 */
export const getJobByIdInternal = internalQuery({
  args: {
    jobId: v.id("recurringJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId)
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

    // Get all jobs that are due to run
    const jobsDue = await ctx.runQuery(
      internal.recurringJobs.getJobsDueToRun,
      {
        currentTime,
      }
    )

    console.log(
      `[RecurringJobs] Found ${jobsDue.length} recurring jobs due to run`
    )

    // Execute each job
    for (const job of jobsDue) {
      try {
        console.log(
          `[RecurringJobs] Executing job ${job._id} (count: ${job.currentCount + 1}/${job.repeatCount})`
        )
        await ctx.runAction(internal.recurringJobs.executeJob, {
          jobId: job._id,
        })
      } catch (error) {
        console.error(
          `[RecurringJobs] Error executing job ${job._id}:`,
          error
        )
        // Continue with other jobs even if one fails
      }
    }

    return { executed: jobsDue.length }
  },
})
