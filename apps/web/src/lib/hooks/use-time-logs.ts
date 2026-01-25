import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

// TimeLog type matching what the queries actually return (completed logs only)
export type TimeLog = {
  _id: Id<"timeLogs">
  taskId: Id<"tasks">
  activityType?: string
  startTime: number
  endTime: number // Always present for completed logs
  createdAt: number
}

// ActiveTimeLog type for ongoing tasks
export type ActiveTimeLog = {
  _id: Id<"timeLogs">
  taskId: Id<"tasks">
  activityType?: string
  startTime: number
  createdAt: number
  task: {
    _id: Id<"tasks">
    title: string
    description?: string
    repositoryId?: Id<"repositories">
  }
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

export function useActiveTimeLog() {
  const activeTimeLog = useStableQuery(api.timeLogs.getActiveTimeLog)

  return {
    activeTimeLog,
    isLoading: activeTimeLog === undefined,
    hasActiveTask: activeTimeLog !== null && activeTimeLog !== undefined,
  }
}

export function useSaveTimeLog() {
  const saveTimeLog = useMutation(api.timeLogs.saveTimeLog)

  return {
    saveTimeLog: (data: {
      taskId: Id<"tasks">
      startTime: number
      endTime?: number // Optional - undefined means ongoing task
      activityType?: TimeLog["activityType"]
    }) => saveTimeLog(data),
  }
}

export function useStopTimeLog() {
  const stopTimeLog = useMutation(api.timeLogs.stopTimeLog)

  return {
    stopTimeLog: (data: { timeLogId: Id<"timeLogs">; endTime: number }) =>
      stopTimeLog(data),
  }
}

export function useUpdateTimeLogEndTime() {
  const updateTimeLogEndTime = useMutation(api.timeLogs.updateTimeLogEndTime)

  return {
    updateTimeLogEndTime: (data: {
      timeLogId: Id<"timeLogs">
      endTime: number
    }) => updateTimeLogEndTime(data),
  }
}

export function useDeleteTimeLog() {
  const deleteTimeLog = useMutation(api.timeLogs.deleteTimeLog)

  return {
    deleteTimeLog: (timeLogId: Id<"timeLogs">) => deleteTimeLog({ timeLogId }),
  }
}
