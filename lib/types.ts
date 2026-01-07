export type AgentStatus =
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "CREATING"
  | "EXPIRED"

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  source: {
    repository: string
    ref?: string
  }
  target: {
    url: string
    branchName?: string
    prUrl?: string
    autoCreatePr: boolean
  }
  createdAt: string
  summary?: string
  audioSummary?: string // Base64 encoded audio data
}

export interface AgentMessage {
  id: string
  type: "user_message" | "assistant_message" | "tool_call" | "tool_result"
  text?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: string
}

export interface AgentConversation {
  id: string
  messages: AgentMessage[]
}

export interface ListAgentsResponse {
  agents: Agent[]
  nextCursor?: string
}

export interface PaginatedAgentsResponse {
  agents: Agent[]
  limit: number
  total: number
  hasMore?: boolean // Indicates if there might be more agents (for live mode)
  simulation: boolean
}

// Re-export types from the schema for backwards compatibility
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
} from "@/lib/validators/cursor/launch-agent"
