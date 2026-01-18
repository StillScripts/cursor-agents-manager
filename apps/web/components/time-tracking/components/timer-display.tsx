"use client"

import { formatDuration } from "helpers"
import { useAtom } from "jotai"
import { Clock, Play, Square } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { descriptionInputAtom, taskInputAtom } from "@/lib/atoms"
import { useRepositories } from "@/lib/hooks/use-repositories"
import { useTasks } from "@/lib/hooks/use-tasks"
import {
  useActiveTimeLog,
  useSaveTimeLog,
  useStopTimeLog,
  useTodayTimeLogs,
} from "@/lib/hooks/use-time-logs"

export function TimerDisplay() {
  const [taskInput, setTaskInput] = useAtom(taskInputAtom)
  const [descriptionInput, setDescriptionInput] = useAtom(descriptionInputAtom)
  const [selectedRepositoryUrl, setSelectedRepositoryUrl] = useState<
    string | undefined
  >(undefined)
  const [elapsed, setElapsed] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  const { tasks, createTask } = useTasks()
  const { repositories } = useRepositories()
  const { activeTimeLog, hasActiveTask } = useActiveTimeLog()
  const { saveTimeLog } = useSaveTimeLog()
  const { stopTimeLog } = useStopTimeLog()
  const { timeLogs: todayTimeLogs } = useTodayTimeLogs()

  // Calculate today's total from Convex timeLogs
  const todayTotal =
    todayTimeLogs?.reduce(
      (total, log) => total + (log.endTime - log.startTime),
      0
    ) ?? 0

  // Update elapsed time based on active time log from Convex
  useEffect(() => {
    if (!activeTimeLog) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - activeTimeLog.startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [activeTimeLog])

  // Sync task input with active time log
  useEffect(() => {
    if (activeTimeLog) {
      setTaskInput(activeTimeLog.task.title)
      setDescriptionInput(activeTimeLog.task.description || "")
      // Find the repository URL from the repositoryId
      const repo = repositories?.find(
        (r) => r._id === activeTimeLog.task.repositoryId
      )
      setSelectedRepositoryUrl(repo?.url)
    } else {
      setTaskInput("")
      setDescriptionInput("")
      setSelectedRepositoryUrl(undefined)
    }
  }, [activeTimeLog, setTaskInput, setDescriptionInput, repositories])

  const handleStart = async () => {
    if (!taskInput.trim() || isStarting || hasActiveTask) return

    setIsStarting(true)
    try {
      const title = taskInput.trim()
      const description = descriptionInput.trim() || undefined

      // Find existing task with same title, or create new one
      let taskId: Id<"tasks">
      const existingTask = tasks?.find((t) => t.title === title)
      if (existingTask) {
        taskId = existingTask._id
      } else {
        // Map URL to repository ID
        const repositoryId = selectedRepositoryUrl
          ? repositories?.find((r) => r.url === selectedRepositoryUrl)?._id
          : undefined

        taskId = await createTask({
          title,
          description,
          repositoryId,
        })
      }

      // Create time log in Convex (without endTime = ongoing task)
      await saveTimeLog({
        taskId,
        startTime: Date.now(),
        // No endTime = ongoing task
      })
    } catch (error) {
      console.error("Failed to start timer:", error)
      // Show error to user if they already have an active task
      if (
        error instanceof Error &&
        error.message.includes("already have an active task")
      ) {
        alert(error.message)
      }
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    if (!activeTimeLog || isStopping) return

    setIsStopping(true)
    try {
      const endTime = Date.now()

      // Stop the active time log by setting endTime
      await stopTimeLog({
        timeLogId: activeTimeLog._id,
        endTime,
      })
    } catch (error) {
      console.error("Failed to stop time log:", error)
    } finally {
      setIsStopping(false)
    }
  }

  const isRunning = hasActiveTask && activeTimeLog !== null

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative">
        <div
          className={`text-7xl md:text-8xl font-mono font-light tracking-tight transition-colors ${isRunning ? "text-primary" : "text-foreground"}`}
        >
          {formatDuration(isRunning ? elapsed : 0)}
        </div>
        {isRunning && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
        )}
      </div>

      {isRunning && activeTimeLog && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xl font-medium text-foreground">
            {activeTimeLog.task.title}
          </p>
          {activeTimeLog.task.description && (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {activeTimeLog.task.description}
            </p>
          )}
        </div>
      )}

      {!isRunning && (
        <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <Input
            placeholder="What are you working on?"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            className="h-12 text-base bg-secondary border-0 placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />
          <Textarea
            placeholder="Description (optional)"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            rows={3}
            className="text-sm bg-secondary border-0 placeholder:text-muted-foreground/50 focus-visible:ring-primary resize-none"
          />
          {repositories && repositories.length > 0 && (
            <Select
              value={selectedRepositoryUrl || ""}
              onValueChange={(value) =>
                setSelectedRepositoryUrl(value || undefined)
              }
            >
              <SelectTrigger className="h-12 text-base bg-secondary border-0 focus-visible:ring-primary">
                {selectedRepositoryUrl ? (
                  <SelectValue />
                ) : (
                  <span className="text-muted-foreground">
                    Repository (optional)
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {repositories.map((repo) => (
                  <SelectItem key={repo.url} value={repo.url}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Start/Stop Button */}
      <Button
        size="lg"
        onClick={isRunning ? handleStop : handleStart}
        disabled={
          (!isRunning && (!taskInput.trim() || hasActiveTask)) ||
          isStarting ||
          isStopping
        }
        className={`h-14 px-10 text-lg font-medium rounded-full transition-all ${
          isRunning
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        } disabled:opacity-30`}
      >
        {isRunning ? (
          <>
            <Square className="w-5 h-5 mr-2 fill-current" />
            {isStopping ? "Stopping..." : "Stop"}
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2 fill-current" />
            {isStarting ? "Starting..." : "Start"}
          </>
        )}
      </Button>

      {/* Today's Total */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="text-sm">
          Today: {formatDuration(todayTotal + (isRunning ? elapsed : 0))}
        </span>
      </div>
    </div>
  )
}
