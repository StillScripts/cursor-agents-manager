"use node"

import { decryptData } from "encryption"
import type { Agent } from "validators"
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
    targetBranchName: agent.target.branchName,
    targetUrl: agent.target.url,
    targetPrUrl: agent.target.prUrl,
    targetAutoCreatePr: agent.target.autoCreatePr,
    model: undefined,
    summary: agent.summary,
    providerData: { createdAt: agent.createdAt },
    createdAt: agent.createdAt,
  }
}

/**
 * Fetch the latest agents from Cursor API for a user
 */
async function fetchLatestAgentsFromCursor(
  apiKey: string,
  limit = 10
): Promise<{ agents: Agent[] | null; error?: string }> {
  try {
    const response = await fetch(`${CURSOR_API_URL}?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `[Sync] Failed to fetch agents list: ${response.status} - ${errorText}`
      )
      return {
        agents: null,
        error: `API error: ${response.status}`,
      }
    }

    const data = await response.json()
    return { agents: data.agents || [] }
  } catch (error) {
    console.error("[Sync] Error fetching agents list:", error)
    return {
      agents: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Internal action to sync recent agents from Cursor API
 * This is called by the nightly cron job
 *
 * For each user with a Cursor API key:
 * 1. Fetch their latest 10 agents from Cursor API
 * 2. Filter to agents created in the last 24 hours
 * 3. Create or update agent records in the database
 */
export const syncRecentAgents = internalAction({
  args: {},
  handler: async (ctx) => {
    // Calculate timestamp for 24 hours ago
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    // Get all users with Cursor API keys
    const usersWithApiKeys = await ctx.runQuery(
      internal.apiKeys.getUsersWithCursorApiKeys
    )

    if (usersWithApiKeys.length === 0) {
      console.log("[Sync] No users with Cursor API keys found")
      return {
        synced: 0,
        created: 0,
        updated: 0,
        errors: 0,
        skipped: 0,
      }
    }

    let synced = 0
    let created = 0
    let updated = 0
    let errors = 0
    let skipped = 0

    // Process each user
    for (const userRecord of usersWithApiKeys) {
      // Decrypt API key
      let apiKey: string | null = null
      try {
        apiKey = decryptData(userRecord.encryptedCursorApiKey)
      } catch (error) {
        console.error(
          `[Sync] Failed to decrypt API key for user ${userRecord.userId}:`,
          error
        )
        skipped++
        continue
      }

      // Fetch latest 10 agents from Cursor API
      const { agents: cursorAgents, error } = await fetchLatestAgentsFromCursor(
        apiKey,
        10
      )

      if (error || !cursorAgents) {
        console.error(
          `[Sync] Failed to fetch agents for user ${userRecord.userId}: ${error}`
        )
        errors++
        continue
      }

      // Filter to agents created in the last 24 hours
      const recentAgents = cursorAgents.filter((agent) => {
        const createdAtMs = new Date(agent.createdAt).getTime()
        return createdAtMs >= oneDayAgo
      })

      if (recentAgents.length === 0) {
        console.log(
          `[Sync] No recent agents found for user ${userRecord.userId}`
        )
        continue
      }

      console.log(
        `[Sync] Found ${recentAgents.length} recent agents for user ${userRecord.userId}`
      )

      // Convert agents to DB format
      const agentsToUpsert = recentAgents.map((agent) =>
        cursorAgentToDbFormat(agent)
      )

      // Batch upsert agents
      try {
        const results = await ctx.runMutation(
          internal.agents.batchUpsertInternal,
          {
            userId: userRecord.userId,
            agents: agentsToUpsert,
          }
        )

        // Count created vs updated
        for (const result of results) {
          if (result.updated) {
            updated++
          } else {
            created++
          }
          synced++
        }

        console.log(
          `[Sync] Synced ${results.length} agents for user ${userRecord.userId} (${results.filter((r) => r.updated).length} updated, ${results.filter((r) => !r.updated).length} created)`
        )
      } catch (error) {
        console.error(
          `[Sync] Failed to upsert agents for user ${userRecord.userId}:`,
          error
        )
        errors++
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(
      `[Sync] Completed: ${synced} synced (${created} created, ${updated} updated), ${errors} errors, ${skipped} skipped`
    )

    return {
      synced,
      created,
      updated,
      errors,
      skipped,
    }
  },
})
