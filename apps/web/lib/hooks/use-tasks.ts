"use client"

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

export interface Task {
  _id: Id<"tasks">
  title: string
  description?: string
  createdAt: number
}

export function useTasks() {
  const tasks = useStableQuery(api.tasks.getTasks)
  const createTask = useMutation(api.tasks.createTask)
  const deleteTask = useMutation(api.tasks.deleteTask)

  return {
    tasks,
    isLoading: tasks === undefined,
    hasTasks: (tasks?.length ?? 0) > 0,
    createTask: (data: { title: string; description?: string }) =>
      createTask(data),
    deleteTask: (taskId: Id<"tasks">) => deleteTask({ taskId }),
  }
}

export function useTask(taskId: Id<"tasks"> | null) {
  const task = useStableQuery(api.tasks.getTask, taskId ? { taskId } : "skip")

  return {
    task,
    isLoading: task === undefined,
  }
}
