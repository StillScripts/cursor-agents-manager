"use client"

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

// TimeLog type matching what the queries actually return
export type TimeLog = {
  _id: Id<"timeLogs">
  agentId: string
  activityType: "task_creation" | "conversation_review"
  startTime: number
  endTime?: number
  createdAt: number
}

export function useAgentTimeLogs(agentId: string) {
  const timeLogs = useStableQuery(
    api.timeLogs.getTimeLogsByAgent,
    agentId ? { agentId } : "skip"
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

export function useSaveTimeLog() {
  const saveTimeLog = useMutation(api.timeLogs.saveTimeLog)

  return {
    saveTimeLog: (data: {
      agentId: string
      activityType: TimeLog["activityType"]
      startTime: number
    }) => saveTimeLog(data),
  }
}
