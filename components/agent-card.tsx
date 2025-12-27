"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronRight, GitBranch } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import type { Agent } from "@/lib/types"
import { StatusBadge } from "./status-badge"

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const repoName = agent.source.repository.split("/").slice(-2).join("/")

  return (
    <Link href={`/agent/${agent.id}`}>
      <Card className="bg-card border-border hover:bg-accent/50 transition-colors active:scale-[0.98]">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={agent.status} />
              </div>
              <h3 className="font-semibold text-foreground text-sm truncate">
                {agent.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <GitBranch className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{repoName}</span>
                <span className="text-border">·</span>
                <span className="flex-shrink-0">{agent.source.ref}</span>
              </div>
              {agent.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {agent.summary}
                </p>
              )}
              <p className="text-xs text-muted-foreground/70 mt-1">
                {formatDistanceToNow(new Date(agent.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
