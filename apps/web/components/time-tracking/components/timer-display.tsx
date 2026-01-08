"use client"

import { formatDuration } from "helpers"
import { useAtom } from "jotai"
import { Clock, Play, Square } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import {
  activeTimerAtom,
  descriptionInputAtom,
  taskInputAtom,
} from "@/lib/atoms"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useSaveTimeLog, useTodayTimeLogs } from "@/lib/hooks/use-time-logs"

export function TimerDisplay() {
  const [activeTimer, setActiveTimer] = useAtom(activeTimerAtom)
  const [taskInput, setTaskInput] = useAtom(taskInputAtom)
  const [descriptionInput, setDescriptionInput] = useAtom(descriptionInputAtom)
  const [elapsed, setElapsed] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  const { tasks, createTask } = useTasks()
  const { saveTimeLog } = useSaveTimeLog()
  const { timeLogs: todayTimeLogs } = useTodayTimeLogs()

  // Calculate today's total from Convex timeLogs
  const todayTotal =
    todayTimeLogs?.reduce(
      (total, log) => total + (log.endTime - log.startTime),
      0
    ) ?? 0

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - activeTimer.startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [activeTimer])

  const handleStart = async () => {
    if (!taskInput.trim() || isStarting) return

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
        taskId = await createTask({ title, description })
      }

      setActiveTimer({
        title,
        description,
        startTime: Date.now(),
        taskId,
      })
    } catch (error) {
      console.error("Failed to start timer:", error)
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    if (!activeTimer || !activeTimer.taskId || isStopping) return

    setIsStopping(true)
    try {
      const endTime = Date.now()

      await saveTimeLog({
        taskId: activeTimer.taskId as Id<"tasks">,
        startTime: activeTimer.startTime,
        endTime,
      })

      setActiveTimer(null)
      setTaskInput("")
      setDescriptionInput("")
    } catch (error) {
      console.error("Failed to save time log:", error)
    } finally {
      setIsStopping(false)
    }
  }

  const isRunning = activeTimer !== null

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

      {isRunning && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xl font-medium text-foreground">
            {activeTimer.title}
          </p>
          {activeTimer.description && (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {activeTimer.description}
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
        </div>
      )}

      {/* Start/Stop Button */}
      <Button
        size="lg"
        onClick={isRunning ? handleStop : handleStart}
        disabled={(!isRunning && !taskInput.trim()) || isStarting || isStopping}
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
