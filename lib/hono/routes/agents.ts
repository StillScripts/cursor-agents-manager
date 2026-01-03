import { createOpenAI } from "@ai-sdk/openai"
import { zValidator } from "@hono/zod-validator"
import { generateText } from "ai"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { extractUserMessagesAndLastAssistant } from "@/lib/conversation-utils"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/encryption"
import { type AuthVariables, requireAuth } from "@/lib/hono/middleware/auth"
import {
  type SimulationVariables,
  withSimulationMode,
} from "@/lib/hono/middleware/simulation"
import {
  addMessageToConversation,
  addSimulatedAgent,
  getSimulatedAgents,
  getSimulatedAgentsPaginated,
  getSimulatedConversation,
  removeSimulatedAgent,
  updateSimulatedAgentStatus,
} from "@/lib/mock-data"
import { userApiKeys } from "@/lib/schema/auth-schema"
import {
  type LaunchAgentRequest,
  launchAgentRequestSchema,
} from "@/lib/schemas/cursor/launch-agent"
import type { Agent, AgentConversation } from "@/lib/types"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

// Combine auth and simulation variables
type Variables = AuthVariables & SimulationVariables

const app = new Hono<{ Variables: Variables }>()

// All routes require auth and simulation mode detection
app.use("*", requireAuth)
app.use("*", withSimulationMode)

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
    // Cursor API doesn't accept 'page' parameter - only 'limit' if supported
    // For now, we'll fetch all agents and handle pagination client-side
    if (limit) {
      url.searchParams.set("limit", String(limit))
    }

    console.log("[API /agents GET] Fetching from Cursor API:", url.toString())

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    console.log(
      "[API /agents GET] Cursor API response status:",
      response.status,
      response.statusText
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[API /agents GET] Cursor API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url.toString(),
      })
      throw new Error(`Cursor API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(
      "[API /agents GET] Cursor API success, agents count:",
      data.agents?.length ?? 0
    )

    // Transform Cursor API response to match PaginatedAgentsResponse format
    // The Cursor API may return cursor-based pagination, so we need to handle both cases
    const agents = data.agents || []
    const total = data.total ?? agents.length
    const totalPages = data.totalPages ?? Math.ceil(total / limit)

    return c.json({
      agents,
      page,
      limit,
      total,
      totalPages,
      simulation: false,
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

// POST /api/agents/:id/summarize - Summarize conversation
app.post("/:id/summarize", async (c) => {
  const id = c.req.param("id")
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  // Get conversation
  let conversation: AgentConversation | null = null
  if (simulationMode) {
    conversation = getSimulatedConversation(id)
    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404)
    }
  } else {
    try {
      const response = await fetch(`${CURSOR_API_URL}/${id}/conversation`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      conversation = await response.json()
    } catch (error) {
      console.error("Error fetching conversation:", error)
      return c.json({ error: "Failed to fetch conversation" }, 500)
    }
  }

  // Check if conversation has messages
  if (
    !conversation ||
    !conversation.messages ||
    conversation.messages.length === 0
  ) {
    return c.json({ error: "No conversation messages to summarize" }, 400)
  }

  // Extract only user messages and last assistant message from each turn
  // This saves tokens and focuses on the key information, as the last assistant
  // message in each turn contains a summary of that response
  const condensedMessages = extractUserMessagesAndLastAssistant(
    conversation.messages
  )

  // Format conversation for summarization
  const conversationText = condensedMessages
    .map((msg) => {
      if (msg.type === "user_message") {
        return `User: ${msg.text || ""}`
      } else if (msg.type === "assistant_message") {
        return `Agent: ${msg.text || ""}`
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")

  if (!conversationText.trim()) {
    return c.json(
      { error: "Conversation has no meaningful content to summarize" },
      400
    )
  }

  // Get user's OpenAI API key from database
  const user = c.get("user")
  const [apiKeyRecord] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, user.id))
    .limit(1)

  if (!apiKeyRecord || !apiKeyRecord.encryptedOpenaiApiKey) {
    return c.json(
      {
        error:
          "OpenAI API key not configured. Please add your OpenAI API key in Account settings to enable summaries.",
      },
      400
    )
  }

  let openaiApiKey: string
  try {
    openaiApiKey = decryptData(apiKeyRecord.encryptedOpenaiApiKey)
  } catch (error) {
    console.error("Error decrypting OpenAI API key:", error)
    return c.json(
      {
        error:
          "Failed to decrypt OpenAI API key. Please update your API key in Account settings.",
      },
      500
    )
  }

  try {
    // Generate summary using AI SDK with user's API key
    const openaiProvider = createOpenAI({ apiKey: openaiApiKey })
    const { text } = await generateText({
      model: openaiProvider("gpt-4o-mini"),
      prompt: `Please provide a concise summary of the following conversation between a user and a Cursor AI agent. Focus on:
- The main task or goal
- Key actions taken by the agent
- Important decisions or outcomes
- Any errors or issues encountered

Conversation:
${conversationText}

Summary:`,
    })

    return c.json({ summary: text })
  } catch (error) {
    console.error("Error generating summary:", error)
    return c.json({ error: "Failed to generate summary" }, 500)
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
