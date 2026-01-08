"use client"

import { formatDuration } from "helpers"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  PlayCircle,
  Trash2,
} from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  activeTimerAtom,
  descriptionInputAtom,
  taskInputAtom,
  tasksWithEntriesAtom,
  timeEntriesAtom,
  viewAtom,
} from "@/lib/atoms"

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

export function TaskList() {
  const tasks = useAtomValue(tasksWithEntriesAtom)
  const activeTimer = useAtomValue(activeTimerAtom)
  const setActiveTimer = useSetAtom(activeTimerAtom)
  const setTaskInput = useSetAtom(taskInputAtom)
  const setDescriptionInput = useSetAtom(descriptionInputAtom)
  const setView = useSetAtom(viewAtom)
  const [entries, setEntries] = useAtom(timeEntriesAtom)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const toggleExpanded = (title: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  const handleContinue = (task: { title: string; description?: string }) => {
    if (activeTimer) return

    setActiveTimer({
      title: task.title,
      description: task.description,
      startTime: Date.now(),
    })
    setTaskInput(task.title)
    setDescriptionInput(task.description || "")
    setView("timer")
  }

  const handleDelete = (title: string) => {
    setEntries(entries.filter((entry) => entry.title !== title))
  }

  const handleDeleteEntry = (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEntries(entries.filter((entry) => entry.id !== entryId))
  }

  if (tasks.length === 0) {
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
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-3 pr-4">
        {tasks.map((task) => {
          const isExpanded = expandedTasks.has(task.title)
          return (
            <div
              key={task.title}
              className="rounded-lg bg-secondary/50 overflow-hidden"
            >
              <div className="group flex items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => toggleExpanded(task.title)}
                  className="flex-1 min-w-0 text-left hover:bg-secondary/50 rounded p-2 -m-2 transition-colors cursor-pointer"
                  aria-expanded={isExpanded}
                >
                  <p className="font-medium text-foreground truncate">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5 whitespace-pre-wrap line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <Clock className="w-3 h-3" />
                      {formatDuration(task.totalDuration)} total
                    </span>
                    <span>•</span>
                    <span>
                      {task.entries.length}{" "}
                      {task.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(task.title)}
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleContinue(task)}
                    disabled={activeTimer !== null}
                    className="text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-30"
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Continue
                  </Button>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(task.title)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded hover:bg-secondary/50"
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
                      key={entry.id}
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
                          onClick={(e) => handleDeleteEntry(entry.id, e)}
                          className="h-7 w-7 opacity-0 group-hover/entry:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
