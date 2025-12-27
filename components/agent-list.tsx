"use client"

import { Bot } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useAgents } from "@/lib/hooks/use-agents"
import { AgentCard } from "./agent-card"
import { PageHeader } from "./page-header"
import { SimulationBanner } from "./simulation-banner"

export function AgentList() {
  const { data, isLoading, error } = useAgents()

  return (
    <>
      <PageHeader title="Your Agents" />
      {data?.simulation && <SimulationBanner />}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        )}

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
          <div className="space-y-3">
            {data.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
