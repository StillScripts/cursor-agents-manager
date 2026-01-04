import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { type AuthVariables, requireAuth } from "@/lib/hono/middleware/auth"
import {
  type SimulationVariables,
  withSimulationMode,
} from "@/lib/hono/middleware/simulation"
import {
  addMessageToConversation,
  addSimulatedAgent,
  getSimulatedAgents,
  removeSimulatedAgent,
  updateSimulatedAgentStatus,
} from "@/lib/mock-data"
import {
  type LaunchAgentRequest,
  launchAgentRequestSchema,
} from "@/lib/schemas/cursor/launch-agent"
import { fetchAgentConversationData, fetchAgentData } from "@/lib/server/agents"
import {
  batchSaveAgentsToCache,
  dbAgentToApiAgent,
  getAgentFromCache,
  getAgentsFromCache,
  invalidateAgentCache,
  isAgentStale,
  saveAgentToCache,
  updateAgentCache,
} from "@/lib/server/agents-cache"
import type { Agent } from "@/lib/types"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

// Combine auth and simulation variables
type Variables = AuthVariables & SimulationVariables

const app = new Hono<{ Variables: Variables }>()

// All routes require auth and simulation mode detection
app.use("*", requireAuth)
app.use("*", withSimulationMode)

// Query params schema for limit and refresh
const limitSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => Number.parseInt(v || "10", 10)),
  refresh: z
    .string()
    .optional()
    .transform((v) => v === "true"),
})

// ============================================================================
// Agent List & Launch
// ============================================================================

// GET /api/agents - List agents with limit (cache-first)
app.get("/", zValidator("query", limitSchema), async (c) => {
  const { limit, refresh } = c.req.valid("query")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")
  const user = c.get("user")

  if (simulationMode) {
    const allAgents = getSimulatedAgents()
    const agents = allAgents.slice(0, limit)
    return c.json({
      agents,
      limit,
      total: allAgents.length,
      hasMore: limit < allAgents.length,
      simulation: true,
    })
  }

  try {
    // 1. Fetch from database cache
    const cachedAgents = await getAgentsFromCache(user.id, { limit })

    // 2. Determine which agents need refresh
    const staleAgents = refresh
      ? cachedAgents // Refresh all if forced
      : cachedAgents.filter((agent) => isAgentStale(agent, false))

    // 3. If no stale agents or we have cache and no force refresh, return cached
    if (cachedAgents.length > 0 && staleAgents.length === 0) {
      const apiAgents = cachedAgents.map((dbAgent) =>
        dbAgentToApiAgent(dbAgent, false)
      )
      return c.json({
        agents: apiAgents,
        limit,
        total: apiAgents.length,
        hasMore: false, // We don't know for sure from cache
        simulation: false,
        cached: true,
      })
    }

    // 4. Fetch fresh data from Cursor API
    const url = new URL(CURSOR_API_URL)
    url.searchParams.set("limit", String(Math.min(limit, 100))) // API max is 100

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[API /agents GET] Cursor API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url.toString(),
      })

      // On error, return cached data if available
      if (cachedAgents.length > 0) {
        const apiAgents = cachedAgents.map((dbAgent) =>
          dbAgentToApiAgent(dbAgent, false)
        )
        return c.json({
          agents: apiAgents,
          limit,
          total: apiAgents.length,
          hasMore: false,
          simulation: false,
          cached: true,
          stale: true,
        })
      }

      throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const agents = data.agents || []
    const hasMore = !!data.nextCursor

    // 5. Update cache with fresh data
    await batchSaveAgentsToCache(agents, user.id, "cursor")

    return c.json({
      agents,
      limit,
      total: agents.length,
      hasMore,
      simulation: false,
      cached: false,
    })
  } catch (error) {
    console.error("Error fetching agents:", error)
    return c.json({ error: "Failed to fetch agents" }, 500)
  }
})

// POST /api/agents - Launch new agent
app.post("/", zValidator("json", launchAgentRequestSchema), async (c) => {
  const validatedRequest: LaunchAgentRequest = c.req.valid("json")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")
  const user = c.get("user")

  console.log(
    "[API /agents POST] Request body:",
    JSON.stringify(validatedRequest, null, 2)
  )
  console.log("[API /agents POST] Simulation mode:", simulationMode)

  if (simulationMode) {
    console.log("[API /agents POST] Running in SIMULATION mode")

    const newAgent: Agent = {
      id: `bc_${Math.random().toString(36).substr(2, 9)}`,
      name: `${validatedRequest.prompt.text.substring(0, 50)}...`,
      status: "CREATING",
      source: validatedRequest.source,
      target: {
        url: "https://cursor.com/agents?id=bc_sim_new",
        branchName:
          validatedRequest.target?.branchName || `cursor/task-${Date.now()}`,
        autoCreatePr: validatedRequest.target?.autoCreatePr ?? false,
      },
      createdAt: new Date().toISOString(),
    }

    addSimulatedAgent(newAgent)
    console.log("[API /agents POST] Created simulated agent:", newAgent.id)

    // Save to database cache
    await saveAgentToCache(newAgent, user.id, "cursor", validatedRequest.model)

    setTimeout(() => {
      updateSimulatedAgentStatus(newAgent.id, "RUNNING")
    }, 2000)

    return c.json({ ...newAgent, simulation: true }, 201)
  }

  // Live mode
  console.log("[API /agents POST] Running in LIVE mode")
  console.log("[API /agents POST] API key found, length:", apiKey?.length)

  try {
    console.log(
      "[API /agents POST] Sending request to Cursor API:",
      CURSOR_API_URL
    )

    const response = await fetch(CURSOR_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedRequest),
    })

    console.log(
      "[API /agents POST] Cursor API response status:",
      response.status,
      response.statusText
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[API /agents POST] Cursor API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("[API /agents POST] Cursor API success:", data)

    // Save to database cache
    await saveAgentToCache(data, user.id, "cursor", validatedRequest.model)

    return c.json({ ...data, simulation: false }, 201)
  } catch (error) {
    console.error("[API /agents POST] Error launching agent:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to launch agent",
      },
      500
    )
  }
})

// ============================================================================
// Agent Details
// ============================================================================

// GET /api/agents/:id - Get agent details (cache-first)
app.get("/:id", async (c) => {
  const id = c.req.param("id")
  const apiKey = c.get("apiKey")
  const user = c.get("user")

  try {
    // 1. Check cache first
    const cachedAgent = await getAgentFromCache(id, user.id)

    // 2. If cached and fresh, return it
    if (cachedAgent && !isAgentStale(cachedAgent, false)) {
      return c.json(dbAgentToApiAgent(cachedAgent, !apiKey))
    }

    // 3. Fetch fresh data using existing function
    const agent = await fetchAgentData(id, apiKey)

    if (!agent) {
      return c.json({ error: "Agent not found" }, 404)
    }

    // 4. Update cache
    await saveAgentToCache(agent, user.id, "cursor")

    return c.json(agent)
  } catch (error) {
    console.error("Error fetching agent:", error)

    // Fallback to cache if available
    const cachedAgent = await getAgentFromCache(id, user.id)
    if (cachedAgent) {
      return c.json(dbAgentToApiAgent(cachedAgent, !apiKey))
    }

    return c.json({ error: "Agent not found" }, 404)
  }
})

// DELETE /api/agents/:id - Delete agent
app.delete("/:id", async (c) => {
  const id = c.req.param("id")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")
  const user = c.get("user")

  if (simulationMode) {
    removeSimulatedAgent(id)
    // Soft delete from cache
    await invalidateAgentCache(id, user.id)
    return c.json({ success: true, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // Soft delete from cache
    await invalidateAgentCache(id, user.id)

    return c.json({ success: true, simulation: false })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return c.json({ error: "Failed to delete agent" }, 500)
  }
})

// ============================================================================
// Agent Conversation
// ============================================================================

// GET /api/agents/:id/conversation - Get conversation
app.get("/:id/conversation", async (c) => {
  const id = c.req.param("id")
  const apiKey = c.get("apiKey")

  const conversation = await fetchAgentConversationData(id, apiKey)

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  return c.json(conversation)
})

// ============================================================================
// Agent Actions
// ============================================================================

// POST /api/agents/:id/followup - Send follow-up message
app.post("/:id/followup", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  if (simulationMode) {
    addMessageToConversation(id, {
      id: `msg_${Date.now()}`,
      type: "user_message",
      text: body.prompt?.text || body.message,
    })

    setTimeout(() => {
      addMessageToConversation(id, {
        id: `msg_${Date.now() + 1}`,
        type: "assistant_message",
        text: "I understand. I'm working on your follow-up request. This is a simulated response.",
      })
    }, 1000)

    // Revalidate cache for this agent page (revalidates all data fetches on the page)
    try {
      revalidatePath(`/agent/${id}`)
    } catch {
      // Ignore errors in test environment where Next.js cache is not available
    }

    return c.json({ success: true, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/followup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    // Revalidate cache for this agent page (revalidates all data fetches on the page)
    try {
      revalidatePath(`/agent/${id}`)
    } catch {
      // Ignore errors in test environment where Next.js cache is not available
    }

    return c.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error sending follow-up:", error)
    return c.json({ error: "Failed to send follow-up" }, 500)
  }
})

// POST /api/agents/:id/stop - Stop running agent
app.post("/:id/stop", async (c) => {
  const id = c.req.param("id")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")
  const user = c.get("user")

  if (simulationMode) {
    updateSimulatedAgentStatus(id, "FINISHED")
    // Update cache status
    await updateAgentCache(id, user.id, { status: "FINISHED" })
    return c.json({ success: true, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // Update cache status
    await updateAgentCache(id, user.id, { status: "FINISHED" })

    return c.json({ success: true, simulation: false })
  } catch (error) {
    console.error("Error stopping agent:", error)
    return c.json({ error: "Failed to stop agent" }, 500)
  }
})

export { app as agentsApp }
