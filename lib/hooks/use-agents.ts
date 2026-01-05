"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useAction, useQuery as useConvexQuery } from "convex/react"
import { useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import type {
  Agent,
  AgentConversation,
  LaunchAgentRequest,
  PaginatedAgentsResponse,
} from "@/lib/types"

// Cache configuration constants
const FIVE_MINUTES = 5 * 60 * 1000

export const AGENTS_QUERY_KEY = ["agents"] as const

export function useAgents(limit = 10) {
  return useQuery<PaginatedAgentsResponse>({
    queryKey: [...AGENTS_QUERY_KEY, limit],
    queryFn: async () => {
      const response = await fetch(`/api/agents?limit=${limit}`)
      if (!response.ok) throw new Error("Failed to fetch agents")
      return response.json()
    },
    // Preserve previous data while fetching new data
    placeholderData: keepPreviousData,
    // Refetch every 5 minutes in the background
    refetchInterval: FIVE_MINUTES,
    // Keep refetching even when the window is not focused
    refetchIntervalInBackground: false,
  })
}

export function useRefreshAgents() {
  const queryClient = useQueryClient()

  return {
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY }),
  }
}

// Helper function to convert Convex agent document to API format
function dbAgentToApiFormat(dbAgent: {
  agentId: string
  name: string
  status: string
  sourceRepository: string
  sourceRef?: string
  targetBranchName?: string
  targetUrl?: string
  targetPrUrl?: string
  targetAutoCreatePr?: boolean
  summary?: string
  providerData?: { createdAt?: string }
}): Agent {
  return {
    id: dbAgent.agentId,
    name: dbAgent.name,
    status: dbAgent.status as Agent["status"],
    source: {
      repository: dbAgent.sourceRepository,
      ref: dbAgent.sourceRef,
    },
    target: {
      url: dbAgent.targetUrl ?? "",
      branchName: dbAgent.targetBranchName,
      prUrl: dbAgent.targetPrUrl,
      autoCreatePr: dbAgent.targetAutoCreatePr ?? false,
    },
    createdAt:
      (dbAgent.providerData as { createdAt?: string })?.createdAt ??
      new Date().toISOString(),
    summary: dbAgent.summary,
  }
}

export function useAgent(
  id: string,
  initialData?: (Agent & { simulation: boolean }) | null
) {
  const [initialSyncDone, setInitialSyncDone] = useState(false)
  const [actionData, setActionData] = useState<
    (Agent & { simulation: boolean }) | null
  >(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Convex query for reactive database updates
  const dbResult = useConvexQuery(api.agents.getById, { agentId: id })

  // Convex action for syncing from Cursor API
  const getAgentById = useAction(api.agentsActions.getAgentById)

  // Initial sync on mount (if no data in DB, fetches from Cursor API)
  useEffect(() => {
    if (initialSyncDone || !id) return

    const doInitialSync = async () => {
      try {
        setSyncError(null)
        const result = await getAgentById({ agentId: id })
        if (result.agent) {
          setActionData({ ...result.agent, simulation: result.simulation })
        } else {
          setActionData(null)
        }
        setInitialSyncDone(true)
      } catch (err) {
        console.error("Failed to sync agent:", err)
        setSyncError(
          err instanceof Error ? err.message : "Failed to sync agent"
        )
        setInitialSyncDone(true)
      }
    }

    doInitialSync()
  }, [getAgentById, id, initialSyncDone])

  // Determine what data to show
  // Prefer action data (from sync) as it includes simulation status
  // Fall back to database query result
  const data: (Agent & { simulation: boolean }) | null =
    actionData ??
    (dbResult
      ? { ...dbAgentToApiFormat(dbResult), simulation: false }
      : (initialData ?? null))

  // Return in the same format as the old hook
  return {
    data,
    isLoading: !initialSyncDone && dbResult === undefined,
    error: syncError,
  }
}

export function useAgentConversation(
  id: string,
  initialData?: (AgentConversation & { simulation: boolean }) | null
) {
  return useQuery<AgentConversation & { simulation: boolean }>({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${id}/conversation`)
      if (!response.ok) throw new Error("Failed to fetch conversation")
      return response.json()
    },
    enabled: !!id,
    initialData: initialData ?? undefined,
    refetchInterval: 5000,
    // Refetch in the background to keep data fresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export function useLaunchAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LaunchAgentRequest) => {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to launch agent")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })
}

export function useStopAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}/stop`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to stop agent")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete agent")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })
}

export function useSendFollowUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const response = await fetch(`/api/agents/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: { text: message } }),
      })
      if (!response.ok) throw new Error("Failed to send follow-up")
      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", variables.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent", variables.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agents"],
      })
    },
  })
}
