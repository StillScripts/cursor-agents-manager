"use client"

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

// TimeLog type matching what the queries actually return
export type TimeLog = {
  _id: Id<"timeLogs">
  taskId: Id<"tasks">
  activityType?: "development" | "testing" | "review" | "meeting" | "other"
  startTime: number
  endTime: number
  createdAt: number
}

export function useTimeLogsByTask(taskId: Id<"tasks"> | null) {
  const timeLogs = useStableQuery(
    api.timeLogs.getTimeLogsByTask,
    taskId ? { taskId } : "skip"
  )

  return {
    timeLogs,
    isLoading: timeLogs === undefined,
  }
}

export function useAllTimeLogs() {
  const timeLogs = useStableQuery(api.timeLogs.getAllTimeLogs)

  return {
    timeLogs,
    isLoading: timeLogs === undefined,
  }
}

export function useTodayTimeLogs() {
  const timeLogs = useStableQuery(api.timeLogs.getTodayTimeLogs)

  return {
    timeLogs,
    isLoading: timeLogs === undefined,
  }
}

export function useSaveTimeLog() {
  const saveTimeLog = useMutation(api.timeLogs.saveTimeLog)

  return {
    saveTimeLog: (data: {
      taskId: Id<"tasks">
      startTime: number
      endTime: number
      activityType?: TimeLog["activityType"]
    }) => saveTimeLog(data),
  }
}

export function useDeleteTimeLog() {
  const deleteTimeLog = useMutation(api.timeLogs.deleteTimeLog)

  return {
    deleteTimeLog: (timeLogId: Id<"timeLogs">) => deleteTimeLog({ timeLogId }),
  }
}
