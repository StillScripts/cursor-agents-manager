export type AgentStatus = "RUNNING" | "FINISHED" | "ERROR" | "CREATING" | "EXPIRED"

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  source: {
    repository: string
    ref: string
  }
  target: {
    url: string
    branchName?: string
    prUrl?: string
    autoCreatePr: boolean
  }
  createdAt: string
  summary?: string
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
  page: number
  limit: number
  total: number
  totalPages: number
  simulation: boolean
}

export interface LaunchAgentRequest {
  prompt: {
    text: string
    images?: { data: string; dimension: { width: number; height: number } }[]
  }
  source: {
    repository: string
    ref: string
  }
  model?: string
  target?: {
    autoCreatePr?: boolean
    branchName?: string
  }
}
