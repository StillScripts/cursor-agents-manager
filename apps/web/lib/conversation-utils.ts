import type { AgentMessage } from "./types"

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

/**
 * Filters messages to show either:
 * - Only user messages and last assistant (summary) from each turn (condensed)
 * - All messages (full thinking process)
 */
export function filterMessagesForDisplay(
  messages: AgentMessage[],
  showThinkingProcess: boolean
): AgentMessage[] {
  if (showThinkingProcess) {
    return messages
  }
  return extractUserMessagesAndLastAssistant(messages)
}
