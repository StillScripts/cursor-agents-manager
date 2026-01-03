"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  Agent,
  AgentConversation,
  LaunchAgentRequest,
  PaginatedAgentsResponse,
} from "@/lib/types"

// Types for time logs
export interface TimeLogEntry {
  id: number
  userId: string
  taskId: string
  activityType: "task_creation" | "conversation_review"
  startTime: string
  endTime: string | null
  createdAt: string
}

export interface TimeLogsResponse {
  timeLogs: TimeLogEntry[]
}

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

export function useAgent(
  id: string,
  initialData?: (Agent & { simulation: boolean }) | null
) {
  return useQuery<Agent & { simulation: boolean }>({
    queryKey: ["agent", id],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${id}`)
      if (!response.ok) throw new Error("Failed to fetch agent")
      return response.json()
    },
    enabled: !!id,
    initialData: initialData ?? undefined,
    // Refetch in the background to keep data fresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
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

export function useSummarizeConversation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}/summarize`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to summarize conversation")
      }
      const data = await response.json()
      return { id, summary: data.summary }
    },
    onSuccess: (data) => {
      // Store summary in localStorage
      if (typeof window !== "undefined") {
        const key = `agent-summary-${data.id}`
        localStorage.setItem(key, data.summary)
      }
    },
  })
}

export function useAgentTimeLogs(taskId: string) {
  return useQuery<TimeLogsResponse>({
    queryKey: ["timeLogs", taskId],
    queryFn: async () => {
      const response = await fetch(`/api/user/time-logs?taskId=${taskId}`)
      if (!response.ok) throw new Error("Failed to fetch time logs")
      return response.json()
    },
    enabled: !!taskId,
    // Don't throw errors, just fail gracefully
    retry: false,
    // Don't refetch on window focus since time logs don't change often
    refetchOnWindowFocus: false,
  })
}
