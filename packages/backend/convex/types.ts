/**
 * Database types derived from Convex schema
 * These types represent the structure of data stored in Convex
 */

import type { AgentStatus } from "validators/cursor/webhook"
import type { Doc } from "../convex/_generated/dataModel"

/**
 * Agent document type from Convex database
 */
export type AgentDoc = Doc<"agents">

/**
 * Database agent type (internal representation)
 * This is the format used within Convex functions
 */
export interface DbAgent {
  agentId: string
  userId: string
  provider: "cursor" | "claude-code"
  name: string
  status: AgentStatus
  model?: string
  summary?: string
  audioSummary?: string
  sourceRepository: string
  sourceRef?: string
  targetBranchName?: string
  targetUrl?: string
  targetPrUrl?: string
  targetAutoCreatePr?: boolean
  providerData?: Record<string, unknown>
  syncStatus?: "synced" | "stale" | "error"
  syncError?: string
  updatedAt: number
  deletedAt?: number
}

/**
 * Helper type for paginated responses
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  hasMore: boolean
}
