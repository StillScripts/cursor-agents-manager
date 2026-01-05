"use node"

import { v } from "convex/values"
import { decryptData } from "../lib/db/encryption"
import type { LaunchAgentRequest } from "../lib/schemas/cursor/launch-agent"
import { api, internal } from "./_generated/api"
import { action } from "./_generated/server"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

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
    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

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
