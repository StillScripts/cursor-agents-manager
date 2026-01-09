import { z } from "zod"

/**
 * Agent message types from Cursor API
 */
export const agentMessageTypeSchema = z.enum([
  "user_message",
  "assistant_message",
  "tool_call",
  "tool_result",
])

export type AgentMessageType = z.infer<typeof agentMessageTypeSchema>

/**
 * Agent message schema
 * Based on Cursor API conversation response format
 */
export const agentMessageSchema = z.object({
  id: z.string().describe("Unique identifier for the message"),
  type: agentMessageTypeSchema,
  text: z.string().optional().describe("Message text content"),
  toolName: z
    .string()
    .optional()
    .describe("Tool name (for tool_call/tool_result)"),
  toolInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Tool input parameters"),
  toolResult: z.string().optional().describe("Tool execution result"),
})

export type AgentMessage = z.infer<typeof agentMessageSchema>

/**
 * Agent conversation schema
 * Based on Cursor API conversation endpoint response
 */
export const agentConversationSchema = z.object({
  id: z.string().describe("Agent ID"),
  messages: z
    .array(agentMessageSchema)
    .describe("Array of conversation messages"),
})

export type AgentConversation = z.infer<typeof agentConversationSchema>

/**
 * Groups messages into conversation turns.
 * Each turn starts with a user_message and includes all following
 * assistant/tool messages until the next user_message.
 */
export function groupMessagesIntoTurns(
  messages: AgentMessage[]
): AgentMessage[][] {
  const turns: AgentMessage[][] = []
  let currentTurn: AgentMessage[] = []

  for (const message of messages) {
    if (message.type === "user_message") {
      // Start a new turn
      if (currentTurn.length > 0) {
        turns.push(currentTurn)
      }
      currentTurn = [message]
    } else {
      // Add to current turn
      currentTurn.push(message)
    }
  }

  // Add the last turn if it exists
  if (currentTurn.length > 0) {
    turns.push(currentTurn)
  }

  return turns
}

/**
 * Extracts only user messages and the last assistant_message from each turn.
 * This is useful for summarization and showing a condensed view, as the
 * last assistant_message in each turn contains a summary of that response.
 */
export function extractUserMessagesAndLastAssistant(
  messages: AgentMessage[]
): AgentMessage[] {
  const turns = groupMessagesIntoTurns(messages)
  const extracted: AgentMessage[] = []

  for (const turn of turns) {
    // Always include the user message (first in turn)
    const userMessage = turn[0]
    if (userMessage && userMessage.type === "user_message") {
      extracted.push(userMessage)
    }

    // Find the last assistant_message in this turn (the summary)
    let lastAssistant: AgentMessage | null = null
    for (let i = turn.length - 1; i >= 0; i--) {
      if (turn[i].type === "assistant_message") {
        lastAssistant = turn[i]
        break
      }
    }

    // Add the last assistant message if found
    if (lastAssistant) {
      extracted.push(lastAssistant)
    }
  }

  return extracted
}
