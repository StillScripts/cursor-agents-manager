"use client"

import { useMutation } from "@tanstack/react-query"
import { useAction } from "convex/react"
import { useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import { useStableQuery } from "@/lib/hooks/use-stable-query"
import type { Agent, AgentConversation, LaunchAgentRequest } from "@/lib/types"

export const AGENTS_QUERY_KEY = ["agents"] as const

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
  const dbResult = useStableQuery(api.agents.getById, { agentId: id })

  // Convex action for syncing from Cursor API
  const getAgentById = useAction(api.cursor.getAgentById)

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
  const [conversationData, setConversationData] = useState<
    (AgentConversation & { simulation: boolean }) | null
  >(initialData ?? null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  const getConversation = useAction(api.cursor.getConversation)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    const fetchConversation = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getConversation({ agentId: id })
        if (!cancelled) {
          if (result.conversation) {
            setConversationData({
              ...result.conversation,
              simulation: result.simulation,
            })
          } else {
            setConversationData(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch conversation"
          )
          setConversationData(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchConversation()

    // Poll every 5 seconds if conversation exists
    const interval = setInterval(() => {
      if (id && !cancelled) {
        fetchConversation()
      }
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id, getConversation])

  return {
    data: conversationData,
    isLoading,
    error,
  }
}

export function useLaunchAgent() {
  const launchAgent = useAction(api.cursor.launchAgent)

  return useMutation({
    mutationFn: async (data: LaunchAgentRequest) => {
      return await launchAgent({
        prompt: data.prompt,
        source: data.source,
        model: data.model,
        target: data.target,
        webhook: data.webhook,
      })
    },
  })
}

export function useStopAgent() {
  const stopAgent = useAction(api.cursor.stopAgent)

  return useMutation({
    mutationFn: async (id: string) => {
      return await stopAgent({ agentId: id })
    },
  })
}

export function useDeleteAgent() {
  const deleteAgent = useAction(api.cursor.deleteAgent)

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteAgent({ agentId: id })
    },
  })
}

export function useSendFollowUp() {
  const sendFollowUp = useAction(api.cursor.sendFollowUp)

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      return await sendFollowUp({ agentId: id, message })
    },
  })
}
