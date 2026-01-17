"use client"

import { formatDuration, formatTime } from "helpers"
import { Clock, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Id } from "@/convex/_generated/dataModel"
import { useSummarizeTodayWork } from "@/lib/hooks/use-ai"
import { type Task, useTasks } from "@/lib/hooks/use-tasks"
import { type TimeLog, useTodayTimeLogs } from "@/lib/hooks/use-time-logs"
import { cn } from "@/lib/utils"

type TodayEntry = {
  _id: Id<"timeLogs">
  title: string
  startTime: number
  duration: number
}

export function TodayEntries() {
  const { tasks } = useTasks()
  const { timeLogs } = useTodayTimeLogs()
  const summarizeTodayWork = useSummarizeTodayWork()
  const [summary, setSummary] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Map time logs to entries with task titles
  const entries = useMemo((): TodayEntry[] => {
    if (!timeLogs || !tasks) return []

    const taskMap = new Map<Id<"tasks">, Task>(
      tasks.map((task: Task) => [task._id, task])
    )

    return timeLogs
      .map((log: TimeLog): TodayEntry => {
        const task = taskMap.get(log.taskId)
        return {
          _id: log._id,
          title: task?.title ?? "Unknown Task",
          startTime: log.startTime,
          duration: log.endTime - log.startTime,
        }
      })
      .sort((a: TodayEntry, b: TodayEntry) => b.startTime - a.startTime)
  }, [timeLogs, tasks])

  async function handleSummarize(): Promise<void> {
    try {
      const result = await summarizeTodayWork.mutateAsync()
      setSummary(result.summary)
      setIsDialogOpen(true)
    } catch (error) {
      console.error("Failed to summarize today's work:", error)
    }
  }

  if (entries.length === 0) return null

  return (
    <>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Today&apos;s Sessions
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSummarize}
            disabled={summarizeTodayWork.isPending}
          >
            <Sparkles
              className={cn(
                "w-3.5 h-3.5 mr-1.5",
                summarizeTodayWork.isPending && "animate-pulse"
              )}
            />
            {summarizeTodayWork.isPending
              ? "Summarizing..."
              : "Summarize Today's Work"}
          </Button>
        </div>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Today&apos;s Work Summary</DialogTitle>
            <DialogDescription>
              AI-generated summary of your work sessions today
            </DialogDescription>
          </DialogHeader>
          {summary && (
            <div className="mt-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {summary}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
