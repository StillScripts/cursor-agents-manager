"use client"

import { useAction, useQuery } from "convex/react"
import { Bot, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { AgentCard } from "@/app/(authenticated)/_components/agent-card"
import { AgentListSkeleton } from "@/app/(authenticated)/_components/agent-list-skeleton"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { SimulationBanner } from "@/app/(authenticated)/_components/simulation-banner"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Agent } from "@/lib/types"

interface AgentsData {
  agents: Agent[]
  total: number
  hasMore: boolean
  simulation: boolean
}

export function AgentsTable() {
  const [limit, setLimit] = useState(10)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [initialSyncDone, setInitialSyncDone] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [actionData, setActionData] = useState<AgentsData | null>(null)

  // Query for reactive database updates
  const dbResult = useQuery(api.agents.listByUser, { limit })

  // Action for syncing from Cursor API
  const getAgents = useAction(api.agentsActions.getAgents)

  // Initial sync on mount (if no data in DB, fetches from Cursor API)
  useEffect(() => {
    if (initialSyncDone) return

    const doInitialSync = async () => {
      try {
        setIsRefreshing(true)
        setSyncError(null)
        const result = await getAgents({ limit })
        setActionData(result)
        setInitialSyncDone(true)
      } catch (err) {
        console.error("Failed to sync agents:", err)
        setSyncError(
          err instanceof Error ? err.message : "Failed to sync agents"
        )
        setInitialSyncDone(true)
      } finally {
        setIsRefreshing(false)
      }
    }

    doInitialSync()
  }, [getAgents, limit, initialSyncDone])

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setSyncError(null)
      const result = await getAgents({ limit, forceRefresh: true })
      setActionData(result)
    } catch (err) {
      console.error("Failed to refresh agents:", err)
      setSyncError(
        err instanceof Error ? err.message : "Failed to refresh agents"
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [getAgents, limit])

  // Determine what data to show
  // Prefer action data (from sync) as it includes simulation status
  // Fall back to database query result
  const data: AgentsData | null =
    actionData ??
    (dbResult
      ? {
          agents: dbResult.agents.map((agent) => ({
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
          })),
          total: dbResult.total,
          hasMore: dbResult.hasMore ?? false,
          simulation: false, // Will be updated after action runs
        }
      : null)

  const hasMore = data?.hasMore ?? false
  const error = syncError

  // Show loading skeleton during initial sync (before action completes)
  if (!initialSyncDone) {
    return <AgentListSkeleton />
  }

  // Also show skeleton if query is still loading and we have no action data
  if (dbResult === undefined && !actionData) {
    return <AgentListSkeleton />
  }

  return (
    <>
      <PageHeader
        title="Your Agents"
        action={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh agents"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        }
      />
      {data?.simulation && <SimulationBanner />}

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2">
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-destructive mb-2">Failed to load agents</p>
              <p className="text-sm text-muted-foreground">
                Please try again later
              </p>
            </div>
          )}

          {/* Only show "No agents" after initial sync is complete */}
          {initialSyncDone && data?.agents && data.agents.length === 0 && (
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

          {data?.agents && data.agents.length > 0 && (
            <>
              <div className="flex flex-col gap-4 sm:gap-6">
                {data.agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center py-4 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLimit((prev) => prev + 10)}
                    disabled={isRefreshing}
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
