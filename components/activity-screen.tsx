"use client"

import { Clock, FileText } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { SkeletonCard } from "@/components/skeleton-card"
import { Card, CardContent } from "@/components/ui/card"
import {
  formatActivityType,
  formatDateTime,
  formatDurationBetween,
  formatDurationMs,
} from "@/lib/formatting"
import { type TimeLogEntry, useAllTimeLogs } from "@/lib/hooks/use-agents"

function ActivityItem({ log }: { log: TimeLogEntry }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {formatActivityType(log.activityType)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(log.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDurationBetween(log.startTime, log.endTime)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface GroupedLogs {
  taskId: string
  logs: TimeLogEntry[]
  totalDuration: number
}

function AgentActivityGroup({ group }: { group: GroupedLogs }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/agent/${group.taskId}`}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          Agent: {group.taskId}
        </Link>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDurationMs(group.totalDuration)}</span>
        </div>
      </div>
      <div className="space-y-2 pl-4 border-l-2 border-border">
        {group.logs.map((log) => (
          <ActivityItem key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}

export function ActivityScreen() {
  const { data, isLoading } = useAllTimeLogs()

  if (isLoading) {
    return (
      <>
        <PageHeader title="Your Activity" />
        <div className="p-4 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </>
    )
  }

  const timeLogs = data?.timeLogs || []

  // Group logs by agent (taskId)
  const groupedByAgent = timeLogs.reduce(
    (acc, log) => {
      if (!acc[log.taskId]) {
        acc[log.taskId] = []
      }
      acc[log.taskId].push(log)
      return acc
    },
    {} as Record<string, TimeLogEntry[]>
  )

  // Convert to array and calculate totals
  const groups: GroupedLogs[] = Object.entries(groupedByAgent).map(
    ([taskId, logs]) => {
      const totalDuration = logs.reduce((total, log) => {
        const start = new Date(log.startTime)
        const end = log.endTime ? new Date(log.endTime) : new Date()
        return total + (end.getTime() - start.getTime())
      }, 0)

      return {
        taskId,
        logs: logs.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        totalDuration,
      }
    }
  )

  // Sort groups by most recent activity
  groups.sort((a, b) => {
    const aLatest = a.logs[0]?.createdAt || ""
    const bLatest = b.logs[0]?.createdAt || ""
    return new Date(bLatest).getTime() - new Date(aLatest).getTime()
  })

  const totalDurationMs = groups.reduce(
    (total, group) => total + group.totalDuration,
    0
  )

  return (
    <>
      <PageHeader title="Your Activity" />

      <div className="p-4 space-y-4">
        {groups.length > 0 ? (
          <>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatDurationMs(totalDurationMs)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Total Agents
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {groups.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {groups.map((group) => (
                <AgentActivityGroup key={group.taskId} group={group} />
              ))}
            </div>
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">
                No activity yet
              </p>
              <p className="text-sm text-muted-foreground">
                Your time tracking activity will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
