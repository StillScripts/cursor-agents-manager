import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/encryption"
import {
  getSimulatedAgents,
  getSimulatedConversation,
} from "@/lib/mock-data"
import { userApiKeys } from "@/lib/schema/auth-schema"
import { eq } from "drizzle-orm"
import type { Agent, AgentConversation } from "@/lib/types"

const CURSOR_API_URL = "https://api.cursor.com/v0/agents"

/**
 * Server-side function to get user's API key
 */
async function getUserApiKeyServer(userId: string): Promise<string | null> {
  const [apiKey] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)

  if (!apiKey || !apiKey.encryptedApiKey) {
    return null
  }

  try {
    return decryptData(apiKey.encryptedApiKey)
  } catch (error) {
    console.error("Error decrypting API key:", error)
    return null
  }
}

/**
 * Server-side function to fetch agent data
 * Used for ISR and initial data loading
 */
export async function getAgentData(
  id: string
): Promise<(Agent & { simulation: boolean }) | null> {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session) {
    return null
  }

  const apiKey = await getUserApiKeyServer(session.user.id)

  const simulationMode =
    !apiKey ||
    apiKey.trim().length <= 10 ||
    apiKey.includes("undefined") ||
    apiKey.includes("your-api-key") ||
    apiKey.includes("placeholder")

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
      next: { revalidate: 60 }, // Cache for 60 seconds
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
 * Server-side function to fetch agent conversation
 * Used for ISR and initial data loading
 */
export async function getAgentConversationData(
  id: string
): Promise<(AgentConversation & { simulation: boolean }) | null> {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session) {
    return null
  }

  const apiKey = await getUserApiKeyServer(session.user.id)

  const simulationMode =
    !apiKey ||
    apiKey.trim().length <= 10 ||
    apiKey.includes("undefined") ||
    apiKey.includes("your-api-key") ||
    apiKey.includes("placeholder")

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
      next: { revalidate: 5 }, // Cache for 5 seconds (conversations update frequently)
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
