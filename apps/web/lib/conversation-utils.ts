import {
  type AgentMessage,
  extractUserMessagesAndLastAssistant,
} from "validators"

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
