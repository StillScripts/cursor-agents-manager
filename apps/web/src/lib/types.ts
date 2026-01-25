/**
 * Re-export all API types from validators package
 * This ensures a single source of truth for types derived from Zod schemas
 */

import type { Agent } from "validators"

// Agent types
export type {
  Agent,
  AgentConversation,
  AgentMessage,
  AgentStatus,
} from "validators"

// Launch agent types
export type {
  LaunchAgentFormData,
  LaunchAgentRequest,
  LaunchAgentResponse,
  Model,
  Prompt,
  PromptImage,
  Source,
  Target,
  Webhook,
} from "validators/cursor/launch-agent"

// Response types (frontend-specific)
export interface ListAgentsResponse {
  agents: Agent[]
  nextCursor?: string
}

export interface PaginatedAgentsResponse {
  agents: Agent[]
  limit: number
  total: number
  hasMore?: boolean // Indicates if there might be more agents
}
