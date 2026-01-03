"use client"

import { Clock, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAllTimeLogs, type TimeLogEntry } from "@/lib/hooks/use-agents"
import { PageHeader } from "@/components/page-header"
import { SkeletonCard } from "@/components/skeleton-card"

function formatDuration(startTime: string, endTime: string | null): string {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const durationMs = end.getTime() - start.getTime()
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatActivityType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

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
              Task: {log.taskId}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(log.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(log.startTime, log.endTime)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const totalDuration = timeLogs.reduce((total, log) => {
    const start = new Date(log.startTime)
    const end = log.endTime ? new Date(log.endTime) : new Date()
    return total + (end.getTime() - start.getTime())
  }, 0)

  const totalHours = Math.floor(totalDuration / (1000 * 60 * 60))
  const totalMinutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <>
      <PageHeader title="Your Activity" />

      <div className="p-4 space-y-4">
        {timeLogs.length > 0 ? (
          <>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold text-foreground">
                      {totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Activities</p>
                    <p className="text-2xl font-bold text-foreground">
                      {timeLogs.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {timeLogs
                .slice()
                .reverse()
                .map((log) => (
                  <ActivityItem key={log.id} log={log} />
                ))}
            </div>
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No activity yet</p>
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
