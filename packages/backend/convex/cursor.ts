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

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"
const CURSOR_MODELS_API_URL = "https://api.cursor.com/v0/models"

const SIMULATED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "gpt-4o",
  "gpt-4o-mini",
  "o1-preview",
]

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
    simulation: boolean
  }> => {
    const limit = args.limit ?? 20
    const forceRefresh = args.forceRefresh ?? false

    // Get authenticated user
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

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
        simulation: false,
      }
    }

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    // If we have agents in DB and not forcing refresh, return them
    if (dbAgents.length > 0 && !forceRefresh) {
      const agents = dbAgents.map(dbAgentToApiFormat)
      return {
        agents,
        total: agents.length,
        hasMore: agents.length >= limit,
        simulation: simulationMode,
      }
    }

    // If no API key (simulation mode), return empty or existing DB agents
    if (simulationMode) {
      const agents = dbAgents.map(dbAgentToApiFormat)
      return {
        agents,
        total: agents.length,
        hasMore: false,
        simulation: true,
      }
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
            simulation: false,
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
        simulation: false,
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
          simulation: false,
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
    simulation: boolean
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

    // If found in DB, return it
    if (dbAgent) {
      return {
        agent: dbAgentToApiFormat(dbAgent),
        simulation: false,
      }
    }

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    // If no API key (simulation mode), return null
    if (simulationMode) {
      return {
        agent: null,
        simulation: true,
      }
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
            simulation: false,
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
        simulation: false,
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
    simulation: boolean
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    // Check if we're in simulation mode (no API key)
    const simulationMode = !apiKey

    if (simulationMode) {
      // Create a simulated agent
      const simulatedAgentId = `bc_${Math.random().toString(36).substr(2, 9)}`
      const simulatedAgentName = `${args.prompt.text.substring(0, 50)}${args.prompt.text.length > 50 ? "..." : ""}`

      const createdAt = new Date().toISOString()

      // Create agent in Convex
      await ctx.runMutation(api.agents.create, {
        agentId: simulatedAgentId,
        provider: "cursor" as const,
        name: simulatedAgentName,
        status: "CREATING" as const,
        sourceRepository: args.source.repository,
        sourceRef: args.source.ref,
        targetBranchName: args.target?.branchName,
        targetUrl: `https://cursor.com/agents?id=${simulatedAgentId}`,
        targetPrUrl: undefined,
        targetAutoCreatePr: args.target?.autoCreatePr ?? false,
        model: args.model,
        summary: undefined,
        taskId: args.taskId,
        providerData: {
          simulation: true,
          createdAt,
        },
      })

      // Return the agent data in API format
      return {
        id: simulatedAgentId,
        name: simulatedAgentName,
        status: "CREATING",
        simulation: true,
      }
    }

    // Live mode - call Cursor API
    try {
      // Build request body
      const requestBody: LaunchAgentRequest = {
        prompt: args.prompt,
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
        simulation: false,
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

    // Get agent from database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    if (!dbAgent) {
      throw new Error("Agent not found")
    }

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      // In simulation mode, just update the status in the database
      await ctx.runMutation(api.agents.updateStatus, {
        agentId: args.agentId,
        status: "FINISHED",
      })
      return { success: true, simulation: true }
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

      return { success: true, simulation: false }
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

    // Get agent from database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    if (!dbAgent) {
      throw new Error("Agent not found")
    }

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      // In simulation mode, just soft delete in the database
      await ctx.runMutation(api.agents.softDelete, {
        agentId: args.agentId,
      })
      return { success: true, simulation: true }
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

      return { success: true, simulation: false }
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
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get agent from database
    const dbAgent = await ctx.runQuery(internal.agents.getByIdInternal, {
      userId: authUser.userId,
      agentId: args.agentId,
    })

    if (!dbAgent) {
      throw new Error("Agent not found")
    }

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      // In simulation mode, return a mock response
      return {
        success: true,
        simulation: true,
        message: "Follow-up message sent (simulation mode)",
      }
    }

    // Live mode - call Cursor API
    try {
      const response = await fetch(
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

      const data = await response.json()

      // Refresh agent data in database
      await ctx.runAction(api.cursor.getAgentById, {
        agentId: args.agentId,
      })

      return {
        success: true,
        simulation: false,
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
    simulation: boolean
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      // Return mock conversation for simulation mode
      return {
        conversation: {
          id: args.agentId,
          messages: [
            {
              id: "msg_placeholder",
              type: "assistant_message",
              text: "This is a simulated conversation. Add your Cursor API key to see real conversations.",
            },
          ],
        },
        simulation: true,
      }
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
            simulation: false,
          }
        }

        const errorText = await response.text()
        throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
      }

      const conversation: AgentConversation = await response.json()

      return {
        conversation,
        simulation: false,
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
    simulation: boolean
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      // Return mock conversation for simulation mode
      return {
        conversation: {
          id: args.agentId,
          messages: [
            {
              id: "msg_placeholder",
              type: "assistant_message",
              text: "This is a simulated conversation. Add your Cursor API key to see real conversations.",
            },
          ],
        },
        simulation: true,
      }
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
            simulation: false,
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

      return {
        conversation,
        nextCursor,
        simulation: false,
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
 * Get list of available models
 * Uses ActionCache for caching - models are the same for all users
 */
export const getModels = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    models: string[]
    simulation: boolean
  }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get encrypted API key record
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    // Decrypt API key if it exists
    let apiKey: string | null = null
    if (record?.encryptedCursorApiKey) {
      try {
        apiKey = decryptData(record.encryptedCursorApiKey)
      } catch {
        apiKey = null
      }
    }

    const simulationMode = !apiKey

    if (simulationMode) {
      return {
        models: SIMULATED_MODELS,
        simulation: true,
      }
    }

    // Live mode - use ActionCache to fetch and cache models
    try {
      const result = await modelsCache.fetch(ctx, { apiKey: apiKey ?? "" })
      return {
        models: result.models,
        simulation: false,
      }
    } catch (error) {
      console.error("[Convex getModels] Error fetching models:", error)

      // Fallback to simulated models on error
      return {
        models: SIMULATED_MODELS,
        simulation: true,
      }
    }
  },
})
