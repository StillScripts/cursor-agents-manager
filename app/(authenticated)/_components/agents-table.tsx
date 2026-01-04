"use client"

import { Bot, RefreshCw } from "lucide-react"
import { useState } from "react"
import { AgentCard } from "@/app/(authenticated)/_components/agent-card"
import {
  AgentCardSkeleton,
  AgentListSkeleton,
} from "@/app/(authenticated)/_components/agent-list-skeleton"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { SimulationBanner } from "@/app/(authenticated)/_components/simulation-banner"
import { Button } from "@/components/ui/button"
import { useAgents, useRefreshAgents } from "@/lib/hooks/use-agents"

export function AgentsTable() {
  const [limit, setLimit] = useState(10)
  const { data, isLoading, error, isFetching } = useAgents(limit)
  const { refresh } = useRefreshAgents()

  const hasMore = isLoading
    ? false
    : data
      ? (data.hasMore ?? (data.simulation ? limit < data.total : false))
      : false

  // Only initial skeleton if we have no data at all (initial load)
  if (isLoading && !data) {
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
            onClick={() => refresh()}
            disabled={isFetching}
            aria-label="Refresh agents"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
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

          {data?.agents && data.agents.length === 0 && (
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

              {isFetching ? (
                <div className="flex flex-col gap-4 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <AgentCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                hasMore && (
                  <div className="flex justify-center py-4 border-t border-border mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLimit((prev) => prev + 10)}
                      disabled={isFetching}
                    >
                      Show More
                    </Button>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
