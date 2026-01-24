"use client"

import { Link } from "@tanstack/react-router"
import {
  formatActivityType,
  formatDateTime,
  formatDurationBetween,
  formatDurationMs,
} from "helpers"
import { Clock, FileText } from "lucide-react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { useTasks } from "@/lib/hooks/use-tasks"
import { type TimeLog, useAllTimeLogs } from "@/lib/hooks/use-time-logs"

function ActivityItem({ log }: { log: TimeLog }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {formatActivityType(log.activityType ?? "")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(new Date(log.createdAt))}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {formatDurationBetween(
                new Date(log.startTime),
                log.endTime ? new Date(log.endTime) : null
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface GroupedLogs {
  taskId: string
  logs: TimeLog[]
  totalDuration: number
}

function TaskActivityGroup({ group }: { group: GroupedLogs }) {
  const { tasks } = useTasks()
  const task = tasks?.find((t) => t._id === group.taskId)

  // Show loading state or task name
  const displayName = task?.title || `Task ${group.taskId}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          to="/tasks"
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {displayName}
        </Link>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDurationMs(group.totalDuration)}</span>
        </div>
      </div>
      <div className="space-y-2 pl-4 border-l-2 border-border">
        {group.logs.map((log) => (
          <ActivityItem key={log._id} log={log} />
        ))}
      </div>
    </div>
  )
}

export function ActivityScreen() {
  const { timeLogs, isLoading } = useAllTimeLogs()

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

  const logs = timeLogs ?? []

  // Group logs by task
  const groupedByTask = logs.reduce(
    (acc, log) => {
      const taskId = log.taskId
      if (!acc[taskId]) {
        acc[taskId] = []
      }
      acc[taskId].push(log)
      return acc
    },
    {} as Record<string, TimeLog[]>
  )

  // Convert to array and calculate totals
  const groups: GroupedLogs[] = Object.entries(groupedByTask).map(
    ([taskId, taskLogs]) => {
      const totalDuration = taskLogs.reduce((total, log) => {
        const start = log.startTime
        const end = log.endTime
        return total + (end - start)
      }, 0)

      return {
        taskId,
        logs: taskLogs.sort((a, b) => b.createdAt - a.createdAt),
        totalDuration,
      }
    }
  )

  // Sort groups by most recent activity
  groups.sort((a, b) => {
    const aLatest = a.logs[0]?.createdAt ?? 0
    const bLatest = b.logs[0]?.createdAt ?? 0
    return bLatest - aLatest
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
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-2xl font-bold text-foreground">
                      {groups.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {groups.map((group) => (
                <TaskActivityGroup key={group.taskId} group={group} />
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
