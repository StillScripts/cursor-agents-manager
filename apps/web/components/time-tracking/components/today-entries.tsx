"use client"

import { formatDuration, formatTime } from "helpers"
import { Clock } from "lucide-react"
import { useMemo } from "react"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useTodayTimeLogs } from "@/lib/hooks/use-time-logs"

export function TodayEntries() {
  const { tasks } = useTasks()
  const { timeLogs } = useTodayTimeLogs()

  // Map time logs to entries with task titles
  const entries = useMemo(() => {
    if (!timeLogs || !tasks) return []

    const taskMap = new Map(tasks.map((task) => [task._id, task]))

    return timeLogs
      .map((log) => {
        const task = taskMap.get(log.taskId)
        return {
          _id: log._id,
          title: task?.title ?? "Unknown Task",
          startTime: log.startTime,
          duration: log.endTime - log.startTime,
        }
      })
      .sort((a, b) => b.startTime - a.startTime)
  }, [timeLogs, tasks])

  if (entries.length === 0) return null

  return (
    <div className="w-full max-w-md">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Today&apos;s Sessions
      </h3>
      <div className="space-y-2">
        {entries.slice(0, 5).map((entry) => (
          <div
            key={entry._id}
            className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30 text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="text-foreground truncate block">
                {entry.title}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground ml-4">
              <span className="text-xs">
                {formatTime(new Date(entry.startTime))}
              </span>
              <span className="font-mono text-foreground">
                {formatDuration(entry.duration)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
