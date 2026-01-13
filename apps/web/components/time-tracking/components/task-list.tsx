"use client"

import { formatDuration } from "helpers"
import { useAtomValue, useSetAtom } from "jotai"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  PlayCircle,
  Rocket,
  Sparkles,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import type { Id } from "@/convex/_generated/dataModel"
import {
  activeTimerAtom,
  descriptionInputAtom,
  taskInputAtom,
  viewAtom,
} from "@/lib/atoms"
import { useAgentsByTaskId } from "@/lib/hooks/use-agents"
import { useSummarizeTasks } from "@/lib/hooks/use-ai"
import { useOpenAIKey } from "@/lib/hooks/use-openai-key"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAllTimeLogs, useDeleteTimeLog } from "@/lib/hooks/use-time-logs"

function formatEntryDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  if (isToday) {
    return `Today at ${timeStr}`
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`
  } else {
    const dayStr = date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    return `${dayStr} at ${timeStr}`
  }
}

function TaskAgentsList({ taskId }: { taskId: Id<"tasks"> }) {
  const agents = useAgentsByTaskId(taskId)

  if (agents === undefined) {
    return null // Loading state
  }

  if (agents.length === 0) {
    return null // Don't show anything if no agents
  }

  return (
    <div className="border-t border-border/30">
      <div className="px-4 py-2 bg-secondary/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Associated Agents
        </p>
      </div>
      {agents.map((agent) => (
        <Link
          key={agent._id}
          href={`/agent/${agent.agentId}`}
          className="group/agent flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-secondary/30 transition-colors"
        >
          <Rocket className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{agent.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agent.status}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function TaskList() {
  const { tasks, deleteTask } = useTasks()
  const { timeLogs } = useAllTimeLogs()
  const { deleteTimeLog } = useDeleteTimeLog()
  const activeTimer = useAtomValue(activeTimerAtom)
  const setActiveTimer = useSetAtom(activeTimerAtom)
  const setTaskInput = useSetAtom(taskInputAtom)
  const setDescriptionInput = useSetAtom(descriptionInputAtom)
  const setView = useSetAtom(viewAtom)
  const [expandedTasks, setExpandedTasks] = useState<Set<Id<"tasks">>>(
    new Set()
  )
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const summarizeTasks = useSummarizeTasks()
  const { hasOpenAIKey } = useOpenAIKey()

  // Group time logs by task and calculate totals
  const tasksWithEntries = useMemo(() => {
    if (!tasks || !timeLogs) return []

    return tasks
      .map((task) => {
        const taskTimeLogs = timeLogs.filter((log) => log.taskId === task._id)
        const totalDuration = taskTimeLogs.reduce(
          (sum, log) => sum + (log.endTime - log.startTime),
          0
        )
        const lastUsed = Math.max(
          ...taskTimeLogs.map((log) => log.startTime),
          0
        )

        return {
          ...task,
          totalDuration,
          lastUsed,
          entries: taskTimeLogs.map((log) => ({
            _id: log._id,
            startTime: log.startTime,
            endTime: log.endTime,
            duration: log.endTime - log.startTime,
          })),
        }
      })
      .filter((task) => task.entries.length > 0) // Only show tasks with time logs
      .sort((a, b) => b.lastUsed - a.lastUsed) // Sort by most recently used
  }, [tasks, timeLogs])

  const toggleExpanded = (taskId: Id<"tasks">) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleContinue = (task: {
    title: string
    description?: string
    _id: Id<"tasks">
  }) => {
    if (activeTimer) return

    setActiveTimer({
      title: task.title,
      description: task.description,
      startTime: Date.now(),
      taskId: task._id,
    })
    setTaskInput(task.title)
    setDescriptionInput(task.description || "")
    setView("timer")
  }

  const handleDelete = async (taskId: Id<"tasks">) => {
    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const handleDeleteEntry = async (
    timeLogId: Id<"timeLogs">,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    try {
      await deleteTimeLog(timeLogId)
    } catch (error) {
      console.error("Failed to delete time log:", error)
    }
  }

  const handleSummarize = async () => {
    try {
      const result = await summarizeTasks.mutateAsync()
      setSummary(result)
      setSummaryDialogOpen(true)
    } catch (error) {
      console.error("Failed to summarize tasks:", error)
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate summary. Please try again."
      )
    }
  }

  if (tasksWithEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-lg">No tasks yet</p>
        <p className="text-muted-foreground/60 text-sm mt-1">
          Start tracking to see your tasks here
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {hasOpenAIKey && tasksWithEntries.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSummarize}
            disabled={summarizeTasks.isPending}
          >
            {summarizeTasks.isPending ? (
              <Spinner className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Summarize Tasks
          </Button>
        </div>
      )}

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Task Summary</DialogTitle>
            <DialogDescription>
              AI-generated summary of your tasks and time tracking
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{summary}</p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setSummaryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3 pr-4">
          {tasksWithEntries.map((task) => {
            const isExpanded = expandedTasks.has(task._id)
            return (
              <div
                key={task._id}
                className="rounded-lg bg-secondary/50 overflow-hidden w-full"
              >
                <div className="group flex items-start gap-2 p-4 w-full">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(task._id)}
                    className="flex-1 min-w-0 text-left rounded p-2 -m-2 transition-colors cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    <p className="font-medium text-foreground wrap-break-word">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 wrap-break-word">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-primary whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {formatDuration(task.totalDuration)} total
                      </span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {task.entries.length}{" "}
                        {task.entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Are You Sure?</DialogTitle>
                          <DialogDescription>
                            You are about to delete the task:{" "}
                            <strong className="font-bold">{task.title}</strong>.
                            This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(task._id)}
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleContinue(task)}
                      disabled={activeTimer !== null}
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-30"
                      title="Continue"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(task._id)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Collapse task" : "Expand task"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/50 bg-background/50">
                    {task.entries.map((entry) => (
                      <div
                        key={entry._id}
                        className="group/entry flex items-center justify-between px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground/60" />
                          <div>
                            <p className="text-sm text-foreground">
                              {formatEntryDateTime(entry.startTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground">
                            {formatDuration(entry.duration)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteEntry(entry._id, e)}
                            className="h-7 w-7 opacity-0 group-hover/entry:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <TaskAgentsList taskId={task._id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
