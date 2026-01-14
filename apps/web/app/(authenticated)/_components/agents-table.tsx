"use client"

import { useAction, useQuery } from "convex/react"
import { Bot, Key } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { AgentCard } from "@/app/(authenticated)/_components/agent-card"
import { AgentListSkeleton } from "@/app/(authenticated)/_components/agent-list-skeleton"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { useStableQuery } from "@/lib/hooks/use-stable-query"
import type { Agent } from "@/lib/types"

export function AgentsTable() {
  const [limit, setLimit] = useState(10)
  const hasLoadedOnce = useRef(false)
  const hasSyncedOnce = useRef(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    hasKey: boolean
    maskedKey: string | null
  } | null>(null)
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true)

  // Use both useQuery (for loading state) and useStableQuery (for stable data)
  const rawQueryResult = useQuery(api.agents.listByUser, { limit })
  const dbResult = useStableQuery(api.agents.listByUser, { limit })
  const syncAgents = useAction(api.cursor.getAgents)
  const getCursorApiKeyStatus = useAction(
    api.apiKeysActions.getCursorApiKeyStatus
  )

  // Fetch API key status
  const fetchApiKeyStatus = useCallback(async () => {
    try {
      setIsLoadingApiKey(true)
      const status = await getCursorApiKeyStatus()
      setApiKeyStatus(status)
    } catch (err) {
      console.error("Failed to fetch API key status:", err)
      setApiKeyStatus({ hasKey: false, maskedKey: null })
    } finally {
      setIsLoadingApiKey(false)
    }
  }, [getCursorApiKeyStatus])

  useEffect(() => {
    fetchApiKeyStatus()
  }, [fetchApiKeyStatus])

  // Track if we've ever received a successful query result
  useEffect(() => {
    if (rawQueryResult !== undefined) {
      hasLoadedOnce.current = true
    }
  }, [rawQueryResult])

  // If no agents in DB, sync from Cursor API
  useEffect(() => {
    if (
      hasLoadedOnce.current &&
      rawQueryResult !== undefined &&
      rawQueryResult.agents.length === 0 &&
      !hasSyncedOnce.current
    ) {
      hasSyncedOnce.current = true
      syncAgents({ limit }).catch((err) => {
        console.error("Failed to sync agents from Cursor:", err)
      })
    }
  }, [rawQueryResult, syncAgents, limit])

  // Transform database result to Agent format
  const agents: Agent[] = dbResult
    ? dbResult.agents.map((agent: Doc<"agents">) => ({
        id: agent.agentId,
        name: agent.name,
        status: agent.status,
        source: {
          repository: agent.sourceRepository,
          ref: agent.sourceRef,
        },
        target: {
          url: agent.targetUrl ?? "",
          branchName: agent.targetBranchName,
          prUrl: agent.targetPrUrl,
          autoCreatePr: agent.targetAutoCreatePr ?? false,
        },
        createdAt:
          (agent.providerData as { createdAt?: string })?.createdAt ??
          new Date().toISOString(),
        summary: agent.summary,
      }))
    : []

  const hasMore = dbResult?.hasMore ?? false

  // Show loading skeleton while query is loading (only on initial load)
  // After first load, useStableQuery will keep showing the last result
  if (rawQueryResult === undefined && !hasLoadedOnce.current) {
    return <AgentListSkeleton />
  }

  // Show loading state while checking API key status
  if (isLoadingApiKey) {
    return (
      <>
        <PageHeader title="Your Agents" />
        <div className="flex-1 overflow-auto">
          <div className="px-3 py-2">
            <AgentListSkeleton />
          </div>
        </div>
      </>
    )
  }

  // Show message if no cursor key is configured
  if (apiKeyStatus && !apiKeyStatus.hasKey) {
    return (
      <>
        <PageHeader title="Your Agents" />
        <div className="flex-1 overflow-auto">
          <div className="px-3 py-2">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-2">
                You need a cursor key to use this feature.
              </p>
              <Link href="/account">
                <Button variant="default" className="mt-2">
                  Go to Account Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Only show "No agents yet" if we have a confirmed query result with no agents
  // Don't show it if we're still loading or if we have agents
  const showEmptyState =
    hasLoadedOnce.current && rawQueryResult !== undefined && agents.length === 0

  return (
    <>
      <PageHeader title="Your Agents" />

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2">
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">No agents yet</p>
              <p className="text-sm text-muted-foreground">
                Launch your first agent to get started
              </p>
            </div>
          )}

          {agents.length > 0 && (
            <>
              <div className="flex flex-col gap-4 sm:gap-6">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center py-4 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLimit((prev) => prev + 10)}
                  >
                    Show More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
