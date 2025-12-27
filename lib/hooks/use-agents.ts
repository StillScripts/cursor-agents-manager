"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  Agent,
  AgentConversation,
  LaunchAgentRequest,
  PaginatedAgentsResponse,
} from "@/lib/types"

interface AgentsResponse {
  agents: Agent[]
  nextCursor?: string
  simulation: boolean
}

export function useAgents(page = 0, limit = 20) {
  return useQuery<PaginatedAgentsResponse>({
    queryKey: ["agents", page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/agents?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error("Failed to fetch agents")
      return response.json()
    },
    refetchInterval: 10000,
  })
}

export function useAgent(id: string) {
  return useQuery<Agent & { simulation: boolean }>({
    queryKey: ["agent", id],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${id}`)
      if (!response.ok) throw new Error("Failed to fetch agent")
      return response.json()
    },
    enabled: !!id,
  })
}

export function useAgentConversation(id: string) {
  return useQuery<AgentConversation & { simulation: boolean }>({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${id}/conversation`)
      if (!response.ok) throw new Error("Failed to fetch conversation")
      return response.json()
    },
    enabled: !!id,
    refetchInterval: 5000,
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
    },
  })
}
