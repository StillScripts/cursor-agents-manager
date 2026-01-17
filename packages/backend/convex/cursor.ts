"use node"

import { ActionCache } from "@convex-dev/action-cache"
import { v } from "convex/values"
import { decryptData } from "encryption"
import type {
  Agent,
  AgentConversation,
  AgentStatus,
  LaunchAgentRequest,
} from "validators"
import { api, components, internal } from "./_generated/api"
import { action, internalAction } from "./_generated/server"
import { checkRateLimit, cursorRateLimiters } from "./rateLimiting"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"
const CURSOR_MODELS_API_URL = "https://api.cursor.com/v0/models"


/**
 * Internal action to get and decrypt Cursor API key for a user
 * Returns null if no API key is configured or decryption fails
 */
export const getCursorApiKey = internalAction({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: args.userId,
      }
    )

    // Decrypt API key if it exists
    if (record?.encryptedCursorApiKey) {
      try {
        return decryptData(record.encryptedCursorApiKey)
      } catch {
        return null
      }
    }

    return null
  },
})

/**
 * Internal action to fetch models from Cursor API
 * This is wrapped by ActionCache for caching
 */
export const fetchModelsFromApi = internalAction({
  args: { apiKey: v.string() },
  handler: async (_ctx, { apiKey }): Promise<{ models: string[] }> => {
    const response = await fetch(CURSOR_MODELS_API_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Cursor API error: ${response.status}`)
    }

    const data = await response.json()
    const models = data.models || []

    console.log(`Fetched ${models.length} models from Cursor API`)
    return { models }
  },
})

// ActionCache for models - caches results for 24 hours
// Models are the same for all users, so we use a shared cache
const modelsCache = new ActionCache(components.actionCache, {
  action: internal.cursor.fetchModelsFromApi,
  name: "cursor-models-v1",
  ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
})

/**
 * Convert a Cursor API agent to the format for our database
 */
function cursorAgentToDbFormat(agent: Agent) {
  // Use createdAt from Cursor API as updatedAt timestamp (milliseconds)
  const updatedAt = new Date(agent.createdAt).getTime()

  return {
    agentId: agent.id,
    provider: "cursor" as const,
    name: agent.name,
    status: agent.status as AgentStatus,
    sourceRepository: agent.source.repository,
    sourceRef: agent.source.ref,
    targetBranchName: agent.target?.branchName,
    targetUrl: agent.target?.url,
    targetPrUrl: agent.target?.prUrl,
    targetAutoCreatePr: agent.target?.autoCreatePr ?? false,
    model: undefined,
    summary: agent.summary,
    providerData: { createdAt: agent.createdAt },
    createdAt: agent.createdAt,
    updatedAt,
  }
}

/**
 * Convert a database agent to the API format used by the frontend
 */
function dbAgentToApiFormat(dbAgent: {
  agentId: string
  name: string
  status: string
  sourceRepository: string
  sourceRef?: string
  targetBranchName?: string
  targetUrl?: string
  targetPrUrl?: string
  targetAutoCreatePr?: boolean
  summary?: string
  audioSummary?: string
  providerData?: { createdAt?: string }
}): Agent {
  return {
    id: dbAgent.agentId,
    name: dbAgent.name,
    status: dbAgent.status as AgentStatus,
    source: {
      repository: dbAgent.sourceRepository,
      ref: dbAgent.sourceRef,
    },
    target: {
      url: dbAgent.targetUrl ?? "",
      branchName: dbAgent.targetBranchName,
      prUrl: dbAgent.targetPrUrl,
      autoCreatePr: dbAgent.targetAutoCreatePr ?? false,
    },
    createdAt: dbAgent.providerData?.createdAt ?? new Date().toISOString(),
    summary: dbAgent.summary,
    audioSummary: dbAgent.audioSummary,
  }
}

/**
 * Get agents for the authenticated user
 * - First checks the database for existing agents
 * - If no agents exist and user has API key, fetches from Cursor API
 * - Syncs fetched agents to the database
 */
export const getAgents = action({
  args: {
    limit: v.optional(v.number()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    agents: Agent[]
    total: number
    hasMore: boolean
  }> => {
    const limit = args.limit ?? 20
    const forceRefresh = args.forceRefresh ?? false

    // Get authenticated user
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before making external API calls
    await checkRateLimit(ctx, cursorRateLimiters.getAgents, authUser.userId)

    // Get agents from the database
    const dbAgents = await ctx.runQuery(internal.agents.listByUserInternal, {
      userId: authUser.userId,
      limit,
    })

    // If we have agents in DB and not forcing refresh, return them immediately
    if (dbAgents.length > 0 && !forceRefresh) {
      return {
        agents: dbAgents.map(dbAgentToApiFormat),
        total: dbAgents.length,
        hasMore: dbAgents.length >= limit,
      }
    }

    // Get and decrypt API key
    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Fetch from Cursor API
    try {
      const url = new URL(CURSOR_API_URL)
      url.searchParams.set("limit", String(Math.min(limit, 100)))

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Convex getAgents] Cursor API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })

        // On error, return cached data if available
        if (dbAgents.length > 0) {
          const agents = dbAgents.map(dbAgentToApiFormat)
          return {
            agents,
            total: agents.length,
            hasMore: agents.length >= limit,
          }
        }

        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const cursorAgents: Agent[] = data.agents || []
      const hasMore = !!data.nextCursor

      // Sync fetched agents to database (updatedAt will be set from Cursor API createdAt)
      if (cursorAgents.length > 0) {
        await ctx.runMutation(api.agents.batchUpsert, {
          agents: cursorAgents.map(cursorAgentToDbFormat),
        })
      }

      return {
        agents: cursorAgents,
        total: cursorAgents.length,
        hasMore,
      }
    } catch (error) {
      console.error("[Convex getAgents] Error fetching agents:", error)

      // Fallback to DB cache
      if (dbAgents.length > 0) {
        const agents = dbAgents.map(dbAgentToApiFormat)
        return {
          agents,
          total: agents.length,
          hasMore: agents.length >= limit,
        }
      }

      throw error instanceof Error ? error : new Error("Failed to fetch agents")
    }
  },
})

/**
 * Get a single agent by ID
 * - First checks the database
 * - If not found and user has API key, fetches from Cursor API
 * - Syncs fetched agent to the database if it exists
 */
export const getAgentById = action({
  args: {
    agentId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    agent: Agent | null
  }> => {
    // Get authenticated user
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get agent from the database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    // If found in DB, return it (no rate limit check needed for cached data)
    if (dbAgent) {
      return {
        agent: dbAgentToApiFormat(dbAgent),
      }
    }

    // Get and decrypt API key
    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    await checkRateLimit(ctx, cursorRateLimiters.getAgentById, authUser.userId)

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Fetch from Cursor API
    try {
      const response = await fetch(`${CURSOR_API_URL}/${args.agentId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return {
            agent: null,
          }
        }

        const errorText = await response.text()
        console.error("[Convex getAgentById] Cursor API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })

        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const cursorAgent: Agent = await response.json()

      // Sync fetched agent to database
      await ctx.runMutation(api.agents.create, {
        agentId: cursorAgent.id,
        provider: "cursor" as const,
        name: cursorAgent.name,
        status: cursorAgent.status,
        sourceRepository: cursorAgent.source.repository,
        sourceRef: cursorAgent.source.ref,
        targetBranchName: cursorAgent.target?.branchName,
        targetUrl: cursorAgent.target?.url,
        targetPrUrl: cursorAgent.target?.prUrl,
        targetAutoCreatePr: cursorAgent.target?.autoCreatePr ?? false,
        model: undefined,
        summary: cursorAgent.summary,
        providerData: {
          ...cursorAgent,
        },
      })

      return {
        agent: cursorAgent,
      }
    } catch (error) {
      console.error("[Convex getAgentById] Error fetching agent:", error)
      throw error instanceof Error ? error : new Error("Failed to fetch agent")
    }
  },
})

/**
 * Launch a new agent via the Cursor API
 * If no API key is configured, creates a simulated agent instead
 */
export const launchAgent = action({
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
    webhook: v.optional(
      v.object({
        url: v.string(),
        secret: v.optional(v.string()),
      })
    ),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    id: string
    name: string
    status: string
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    await checkRateLimit(ctx, cursorRateLimiters.launchAgent, authUser.userId)

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Live mode - call Cursor API
    try {
      // Build request body - explicitly include all fields, especially images
      const requestBody: LaunchAgentRequest = {
        prompt: {
          text: args.prompt.text,
          // Explicitly include images array if it exists and has items
          ...(args.prompt.images &&
            args.prompt.images.length > 0 && {
              images: args.prompt.images,
            }),
        },
        source: args.source,
        ...(args.model && { model: args.model }),
        ...(args.target && {
          target: {
            autoCreatePr: args.target.autoCreatePr,
            openAsCursorGithubApp: args.target.openAsCursorGithubApp ?? false,
            skipReviewerRequest: args.target.skipReviewerRequest ?? false,
            ...(args.target.branchName && {
              branchName: args.target.branchName,
            }),
          },
        }),
      }

      // Add webhook from environment variables if configured
      const webhookUrl = process.env.CURSOR_WEBHOOK_URL
      const webhookSecret = process.env.CURSOR_WEBHOOK_SECRET

      if (webhookUrl) {
        requestBody.webhook = {
          url: webhookUrl,
          ...(webhookSecret && { secret: webhookSecret }),
        }
      } else if (args.webhook) {
        requestBody.webhook = args.webhook
      }

      // Call Cursor API
      const response = await fetch(CURSOR_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const cursorAgent = data

      // Save agent to Convex
      await ctx.runMutation(api.agents.create, {
        agentId: cursorAgent.id,
        provider: "cursor" as const,
        name: cursorAgent.name,
        status: cursorAgent.status,
        sourceRepository: cursorAgent.source.repository,
        sourceRef: cursorAgent.source.ref,
        targetBranchName: cursorAgent.target?.branchName,
        targetUrl: cursorAgent.target?.url,
        targetPrUrl: cursorAgent.target?.prUrl,
        targetAutoCreatePr: cursorAgent.target?.autoCreatePr ?? false,
        model: args.model,
        summary: cursorAgent.summary,
        taskId: args.taskId,
        providerData: {
          createdAt: cursorAgent.createdAt,
          ...cursorAgent,
        },
      })

      // Return the agent data
      return {
        id: cursorAgent.id,
        name: cursorAgent.name,
        status: cursorAgent.status,
      }
    } catch (error) {
      console.error("[Convex launchAgent] Error launching agent:", error)
      throw error instanceof Error ? error : new Error("Failed to launch agent")
    }
  },
})

/**
 * Stop a running agent
 */
export const stopAgent = action({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before stopping agent
    await checkRateLimit(ctx, cursorRateLimiters.stopAgent, authUser.userId)

    // Get agent from database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    if (!dbAgent) {
      throw new Error("Agent not found")
    }

    // Get and decrypt API key
    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Live mode - call Cursor API
    try {
      const response = await fetch(`${CURSOR_API_URL}/${args.agentId}/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      // Update agent status in database
      await ctx.runMutation(api.agents.updateStatus, {
        agentId: args.agentId,
        status: "FINISHED",
      })

      return { success: true }
    } catch (error) {
      console.error("[Convex stopAgent] Error stopping agent:", error)
      throw error instanceof Error ? error : new Error("Failed to stop agent")
    }
  },
})

/**
 * Delete an agent
 */
export const deleteAgent = action({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before deleting agent
    await checkRateLimit(ctx, cursorRateLimiters.deleteAgent, authUser.userId)

    // Get agent from database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    if (!dbAgent) {
      throw new Error("Agent not found")
    }

    // Get and decrypt API key
    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Live mode - call Cursor API
    try {
      const response = await fetch(`${CURSOR_API_URL}/${args.agentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      // Soft delete in database
      await ctx.runMutation(api.agents.softDelete, {
        agentId: args.agentId,
      })

      return { success: true }
    } catch (error) {
      console.error("[Convex deleteAgent] Error deleting agent:", error)
      throw error instanceof Error ? error : new Error("Failed to delete agent")
    }
  },
})

/**
 * Send a follow-up message to an agent
 */
export const sendFollowUp = action({
  args: {
    agentId: v.string(),
    message: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    {
      success: boolean
      message?: string
    } & Record<string, unknown>
  > => {
    const authUser: { userId: string } = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before sending follow-up
    await checkRateLimit(ctx, cursorRateLimiters.sendFollowUp, authUser.userId)

    // Get agent from database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    if (!dbAgent) {
      throw new Error("Agent not found")
    }

    // Get and decrypt API key
    const apiKey: string | null = await ctx.runAction(
      internal.cursor.getCursorApiKey,
      {
        userId: authUser.userId,
      }
    )

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Live mode - call Cursor API
    try {
      const response: Response = await fetch(
        `${CURSOR_API_URL}/${args.agentId}/followup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: { text: args.message },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const data: Record<string, unknown> = await response.json()

      // Refresh agent data in database
      await ctx.runAction(api.cursor.getAgentById, {
        agentId: args.agentId,
      })

      return {
        success: true,
        ...data,
      }
    } catch (error) {
      console.error("[Convex sendFollowUp] Error sending follow-up:", error)
      throw error instanceof Error
        ? error
        : new Error("Failed to send follow-up")
    }
  },
})

/**
 * Get agent conversation
 */
export const getConversation = action({
  args: {
    agentId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    conversation: AgentConversation | null
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get and decrypt API key
    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    await checkRateLimit(
      ctx,
      cursorRateLimiters.getConversation,
      authUser.userId
    )

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Live mode - call Cursor API
    try {
      const response = await fetch(
        `${CURSOR_API_URL}/${args.agentId}/conversation`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return {
            conversation: null,
          }
        }

        const errorText = await response.text()
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const conversation: AgentConversation = await response.json()

      // Automatically sync conversation to Convex database
      try {
        await ctx.runMutation(internal.conversations.upsertConversation, {
          userId: authUser.userId,
          conversation,
        })
      } catch (error) {
        // Log error but don't fail the request if sync fails
        console.error(
          "[Convex getConversation] Error syncing conversation:",
          error
        )
      }

      return {
        conversation,
      }
    } catch (error) {
      console.error(
        "[Convex getConversation] Error fetching conversation:",
        error
      )
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch conversation")
    }
  },
})

/**
 * Get agent conversation with cursor-based pagination
 * This action fetches conversations directly from the Cursor API
 * and does NOT interact with the Convex database
 */
export const getConversationWithCursor = action({
  args: {
    agentId: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    conversation: AgentConversation | null
    nextCursor?: string
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get and decrypt API key
    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    await checkRateLimit(
      ctx,
      cursorRateLimiters.getConversationWithCursor,
      authUser.userId
    )

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Live mode - call Cursor API with pagination support
    try {
      const url = new URL(`${CURSOR_API_URL}/${args.agentId}/conversation`)

      // Add cursor parameter if provided
      if (args.cursor) {
        url.searchParams.set("cursor", args.cursor)
      }

      // Add limit parameter if provided (default to API default)
      if (args.limit) {
        url.searchParams.set("limit", String(args.limit))
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return {
            conversation: null,
          }
        }

        const errorText = await response.text()
        console.error("[Convex getConversationWithCursor] Cursor API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      // Handle both paginated and non-paginated responses
      // If the response has a messages array directly, it's the conversation
      // If it has a conversation object, extract it
      let conversation: AgentConversation | null = null
      let nextCursor: string | undefined

      if (data.conversation) {
        conversation = data.conversation
        nextCursor = data.nextCursor
      } else if (data.id && data.messages) {
        // Response is already in AgentConversation format
        conversation = data
        nextCursor = data.nextCursor
      } else if (data.messages && !data.id) {
        // Response is the conversation itself (messages array without id)
        conversation = {
          id: args.agentId,
          messages: data.messages,
        }
        nextCursor = data.nextCursor
      }

      // Automatically sync conversation to Convex database if we have a conversation
      if (conversation) {
        try {
          await ctx.runMutation(internal.conversations.upsertConversation, {
            userId: authUser.userId,
            conversation,
          })
        } catch (error) {
          // Log error but don't fail the request if sync fails
          console.error(
            "[Convex getConversationWithCursor] Error syncing conversation:",
            error
          )
        }
      }

      return {
        conversation,
        nextCursor,
      }
    } catch (error) {
      console.error(
        "[Convex getConversationWithCursor] Error fetching conversation:",
        error
      )
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch conversation")
    }
  },
})

/**
 * Internal action to fetch and sync conversation from Cursor API
 * Used by webhooks to update conversation when agent status changes
 */
export const syncConversationFromWebhook = internalAction({
  args: {
    userId: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get and decrypt API key
      const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
        userId: args.userId,
      })

      // If no API key, skip syncing
      if (!apiKey) {
        return { success: false, error: "No API key configured" }
      }

      // Fetch conversation from Cursor API
      const response = await fetch(
        `${CURSOR_API_URL}/${args.agentId}/conversation`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          // Conversation doesn't exist yet, which is fine
          return { success: true }
        }

        const errorText = await response.text()
        console.error(
          "[Convex syncConversationFromWebhook] Cursor API error:",
          {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          }
        )
        return {
          success: false,
          error: `Cursor API error: ${response.status} - ${errorText}`,
        }
      }

      const conversation: AgentConversation = await response.json()

      // Update conversation in Convex database
      await ctx.runMutation(internal.conversations.upsertConversation, {
        userId: args.userId,
        conversation,
      })

      return { success: true }
    } catch (error) {
      console.error(
        "[Convex syncConversationFromWebhook] Error syncing conversation:",
        error
      )
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },
})

/**
 * Get list of available models
 * Uses ActionCache for caching - models are the same for all users
 */
export const getModels = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    models: string[]
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    const apiKey = await ctx.runAction(internal.cursor.getCursorApiKey, {
      userId: authUser.userId,
    })

    await checkRateLimit(ctx, cursorRateLimiters.getModels, authUser.userId)

    // Require API key - throw error if not configured
    if (!apiKey) {
      throw new Error("Cursor API key not configured. Please add your API key in Account Settings.")
    }

    // Use ActionCache to fetch and cache models
    try {
      const result = await modelsCache.fetch(ctx, { apiKey })
      return {
        models: result.models,
      }
    } catch (error) {
      console.error("[Convex getModels] Error fetching models:", error)
      throw new Error("Failed to fetch models from Cursor API")
    }
  },
})
