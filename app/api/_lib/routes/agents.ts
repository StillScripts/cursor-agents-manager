import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { z } from "zod"
import {
  addMessageToConversation,
  addSimulatedAgent,
  getSimulatedAgents,
  getSimulatedAgentsPaginated,
  getSimulatedConversation,
  removeSimulatedAgent,
  updateSimulatedAgentStatus,
} from "@/lib/mock-data"
import {
  type LaunchAgentRequest,
  launchAgentRequestSchema,
} from "@/lib/schemas/cursor/launch-agent"
import type { Agent } from "@/lib/types"
import { type AuthVariables, requireAuth } from "../middleware/auth"
import {
  type SimulationVariables,
  withSimulationMode,
} from "../middleware/simulation"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

// Combine auth and simulation variables
type Variables = AuthVariables & SimulationVariables

const app = new Hono<{ Variables: Variables }>()

// All routes require auth and simulation mode detection
app.use("*", requireAuth)
app.use("*", withSimulationMode)

// Helper to simulate network delay
async function simulateDelay() {
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

// Query params schema for pagination
const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Number.parseInt(v || "0", 10)),
  limit: z
    .string()
    .optional()
    .transform((v) => Number.parseInt(v || "20", 10)),
})

// ============================================================================
// Agent List & Launch
// ============================================================================

// GET /api/agents - List agents with pagination
app.get("/", zValidator("query", paginationSchema), async (c) => {
  const { page, limit } = c.req.valid("query")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  if (simulationMode) {
    await simulateDelay()

    const { agents, total, totalPages } = getSimulatedAgentsPaginated(
      page,
      limit
    )
    return c.json({
      agents,
      page,
      limit,
      total,
      totalPages,
      simulation: true,
    })
  }

  try {
    const url = new URL(CURSOR_API_URL)
    url.searchParams.set("limit", String(limit))

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return c.json({ ...data, simulation: false })
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

  console.log(
    "[API /agents POST] Request body:",
    JSON.stringify(validatedRequest, null, 2)
  )
  console.log("[API /agents POST] Simulation mode:", simulationMode)

  if (simulationMode) {
    console.log("[API /agents POST] Running in SIMULATION mode")
    await simulateDelay()

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

// GET /api/agents/:id - Get agent details
app.get("/:id", async (c) => {
  const id = c.req.param("id")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  if (simulationMode) {
    const agents = getSimulatedAgents()
    const agent = agents.find((a) => a.id === id)
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404)
    }
    return c.json({ ...agent, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return c.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return c.json({ error: "Failed to fetch agent" }, 500)
  }
})

// DELETE /api/agents/:id - Delete agent
app.delete("/:id", async (c) => {
  const id = c.req.param("id")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  if (simulationMode) {
    removeSimulatedAgent(id)
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
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  if (simulationMode) {
    const conversation = getSimulatedConversation(id)
    if (!conversation) {
      return c.json({
        id,
        messages: [
          {
            id: "msg_placeholder",
            type: "user_message",
            text: "No conversation history available for this simulated agent.",
          },
        ],
        simulation: true,
      })
    }
    return c.json({ ...conversation, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/conversation`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return c.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return c.json({ error: "Failed to fetch conversation" }, 500)
  }
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

  if (simulationMode) {
    updateSimulatedAgentStatus(id, "FINISHED")
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

    return c.json({ success: true, simulation: false })
  } catch (error) {
    console.error("Error stopping agent:", error)
    return c.json({ error: "Failed to stop agent" }, 500)
  }
})

export { app as agentsApp }
