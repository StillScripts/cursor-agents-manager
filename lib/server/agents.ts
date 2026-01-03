import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getSimulatedAgents, getSimulatedConversation } from "@/lib/mock-data"
import type { Agent, AgentConversation } from "@/lib/types"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

// Revalidate once per day (86400 seconds)
const REVALIDATE_SECONDS = 86400

/**
 * Determines if we're in simulation mode based on API key
 */
function isSimulationMode(apiKey: string | null): boolean {
  return (
    !apiKey ||
    apiKey.trim().length <= 10 ||
    apiKey.includes("undefined") ||
    apiKey.includes("your-api-key") ||
    apiKey.includes("placeholder")
  )
}

/**
 * Core function to fetch agent data
 * Can be used from both server components and API routes
 */
export async function fetchAgentData(
  id: string,
  apiKey: string | null
): Promise<(Agent & { simulation: boolean }) | null> {
  const simulationMode = isSimulationMode(apiKey)

  if (simulationMode) {
    const agents = getSimulatedAgents()
    const agent = agents.find((a) => a.id === id)
    if (!agent) {
      return null
    }
    return { ...agent, simulation: true }
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return { ...data, simulation: false }
  } catch (error) {
    console.error("Error fetching agent:", error)
    return null
  }
}

/**
 * Core function to fetch agent conversation
 * Can be used from both server components and API routes
 */
export async function fetchAgentConversationData(
  id: string,
  apiKey: string | null
): Promise<(AgentConversation & { simulation: boolean }) | null> {
  const simulationMode = isSimulationMode(apiKey)

  if (simulationMode) {
    const conversation = getSimulatedConversation(id)
    if (!conversation) {
      return {
        id,
        messages: [
          {
            id: "msg_placeholder",
            type: "user_message",
            text: "No conversation history available for this simulated agent.",
          },
        ],
        simulation: true,
      }
    }
    return { ...conversation, simulation: true }
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/conversation`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return { ...data, simulation: false }
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return null
  }
}

/**
 * Server component wrapper: Fetches agent data using Next.js headers
 * Used for ISR and initial data loading in page components
 */
export async function getAgentData(
  id: string
): Promise<(Agent & { simulation: boolean }) | null> {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session) {
    return null
  }

  // Import here to avoid issues with server/client boundaries
  const { getUserApiKeyServer } = await import("./agents-server-helpers")
  const apiKey = await getUserApiKeyServer(session.user.id)

  return fetchAgentData(id, apiKey)
}

/**
 * Server component wrapper: Fetches agent conversation using Next.js headers
 * Used for ISR and initial data loading in page components
 */
export async function getAgentConversationData(
  id: string
): Promise<(AgentConversation & { simulation: boolean }) | null> {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session) {
    return null
  }

  // Import here to avoid issues with server/client boundaries
  const { getUserApiKeyServer } = await import("./agents-server-helpers")
  const apiKey = await getUserApiKeyServer(session.user.id)

  return fetchAgentConversationData(id, apiKey)
}
