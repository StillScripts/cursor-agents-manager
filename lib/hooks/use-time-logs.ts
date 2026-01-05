"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"

export type TimeLog = Doc<"timeLogs">

export function useAgentTimeLogs(agentId: string) {
  const timeLogs = useQuery(
    api.timeLogs.getTimeLogsByAgent,
    agentId ? { agentId } : "skip"
  )

  return {
    timeLogs,
    isLoading: timeLogs === undefined,
  }
}

export function useAllTimeLogs() {
  const timeLogs = useQuery(api.timeLogs.getAllTimeLogs)

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
