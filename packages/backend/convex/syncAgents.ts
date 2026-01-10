"use node"

import { decryptData } from "@/lib/encryption"
import type { Agent } from "../lib/types"
import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

/**
 * Convert a Cursor API agent to the format for our database
 */
function cursorAgentToDbFormat(agent: Agent) {
  return {
    agentId: agent.id,
    provider: "cursor" as const,
    name: agent.name,
    status: agent.status as typeof agent.status,
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
  }
}

/**
 * Internal action to sync a single agent from the Cursor API
 */
async function syncAgent(
  ctx: any,
  agent: {
    _id: any
    agentId: string
    userId: string
  },
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CURSOR_API_URL}/${agent.agentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        // Agent no longer exists in Cursor, mark as expired
        await ctx.runMutation(internal.agents.updateStatusInternal, {
          agentId: agent.agentId,
          status: "EXPIRED",
        })
        return { success: true }
      }

      const errorText = await response.text()
      console.error(
        `[Sync] Failed to fetch agent ${agent.agentId}: ${response.status} - ${errorText}`
      )
      return {
        success: false,
        error: `API error: ${response.status}`,
      }
    }

    const cursorAgent: Agent = await response.json()

    // Update agent in database using internal mutation
    const dbFormat = cursorAgentToDbFormat(cursorAgent)
    await ctx.runMutation(internal.agents.updateFromSync, {
      agentId: dbFormat.agentId,
      name: dbFormat.name,
      status: dbFormat.status,
      sourceRepository: dbFormat.sourceRepository,
      sourceRef: dbFormat.sourceRef,
      targetBranchName: dbFormat.targetBranchName,
      targetUrl: dbFormat.targetUrl,
      targetPrUrl: dbFormat.targetPrUrl,
      targetAutoCreatePr: dbFormat.targetAutoCreatePr,
      summary: dbFormat.summary,
      providerData: dbFormat.providerData,
    })

    return { success: true }
  } catch (error) {
    console.error(`[Sync] Error syncing agent ${agent.agentId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Internal action to sync all agents created in the past day
 * This is called by the nightly cron job
 */
export const syncRecentAgents = internalAction({
  args: {},
  handler: async (ctx) => {
    // Calculate timestamp for 24 hours ago
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    // Get all agents created in the past day that are not finished
    const agentsByUser = await ctx.runQuery(
      internal.agents.getAgentsNeedingSync,
      {
        sinceTimestamp: oneDayAgo,
      }
    )

    if (agentsByUser.length === 0) {
      console.log("[Sync] No agents need syncing")
      return {
        synced: 0,
        errors: 0,
        skipped: 0,
      }
    }

    let synced = 0
    let errors = 0
    let skipped = 0

    // Process each user's agents
    for (const { userId, agents } of agentsByUser) {
      // Get encrypted API key for this user
      const apiKeyRecord = await ctx.runQuery(
        internal.apiKeys.getApiKeysRecordInternal,
        {
          userId,
        }
      )

      if (!apiKeyRecord?.encryptedCursorApiKey) {
        console.log(
          `[Sync] Skipping ${agents.length} agents for user ${userId} - no API key`
        )
        skipped += agents.length
        continue
      }

      // Decrypt API key
      let apiKey: string | null = null
      try {
        apiKey = decryptData(apiKeyRecord.encryptedCursorApiKey)
      } catch (error) {
        console.error(
          `[Sync] Failed to decrypt API key for user ${userId}:`,
          error
        )
        skipped += agents.length
        continue
      }

      // Sync each agent for this user
      for (const agent of agents) {
        const result = await syncAgent(ctx, agent, apiKey)
        if (result.success) {
          synced++
        } else {
          errors++
          console.error(
            `[Sync] Failed to sync agent ${agent.agentId}: ${result.error}`
          )
        }

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(
      `[Sync] Completed: ${synced} synced, ${errors} errors, ${skipped} skipped`
    )

    return {
      synced,
      errors,
      skipped,
    }
  },
})
