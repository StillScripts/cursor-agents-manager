"use client"

import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

export type ActivityType = "task_creation" | "conversation_review"

interface TimeLog {
  startTime: number
  endTime?: number
  duration?: number
  activityType: ActivityType
  taskId?: string
}

const STORAGE_KEY_PREFIX = "time_tracking_"

// Get storage key for a specific activity
function getStorageKey(activityType: ActivityType, taskId?: string): string {
  return `${STORAGE_KEY_PREFIX}${activityType}${taskId ? `_${taskId}` : ""}`
}

// Save time log to localStorage
function saveToLocalStorage(
  activityType: ActivityType,
  timeLog: TimeLog,
  taskId?: string
): void {
  try {
    const key = getStorageKey(activityType, taskId)
    localStorage.setItem(key, JSON.stringify(timeLog))
  } catch (error) {
    console.error("Failed to save time log to localStorage:", error)
  }
}

// Load time log from localStorage
function loadFromLocalStorage(
  activityType: ActivityType,
  taskId?: string
): TimeLog | null {
  try {
    const key = getStorageKey(activityType, taskId)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    return JSON.parse(stored) as TimeLog
  } catch (error) {
    console.error("Failed to load time log from localStorage:", error)
    return null
  }
}

// Clear time log from localStorage
function clearLocalStorage(
  activityType: ActivityType,
  taskId?: string
): void {
  try {
    const key = getStorageKey(activityType, taskId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error("Failed to clear time log from localStorage:", error)
  }
}

interface UseTimeTrackingOptions {
  activityType: ActivityType
  taskId?: string
  autoStart?: boolean
  onSave?: (timeLog: TimeLog & { taskId: string }) => Promise<void>
}

export function useTimeTracking({
  activityType,
  taskId,
  autoStart = false,
  onSave,
}: UseTimeTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isTabVisibleRef = useRef(true)

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const stored = loadFromLocalStorage(activityType, taskId)
    if (stored && stored.startTime && !stored.endTime) {
      // Resume tracking if there's an incomplete session
      const elapsed = Date.now() - stored.startTime
      startTimeRef.current = stored.startTime
      setIsTracking(true)
      setElapsedTime(elapsed)
    } else if (autoStart) {
      // Start tracking if autoStart is enabled
      startTracking()
    }
  }, [activityType, taskId, autoStart])

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      isTabVisibleRef.current = isVisible

      if (!isVisible && isTracking) {
        // Tab became hidden - pause tracking
        pauseTracking()
      } else if (isVisible && startTimeRef.current && !isTracking) {
        // Tab became visible - resume tracking if we have a start time
        resumeTracking()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isTracking])

  // Update elapsed time while tracking
  useEffect(() => {
    if (isTracking && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        if (isTabVisibleRef.current && startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current
          setElapsedTime(elapsed)
        }
      }, 1000) // Update every second

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [isTracking])

  const startTracking = () => {
    if (isTracking) return

    const now = Date.now()
    startTimeRef.current = now
    setIsTracking(true)
    setElapsedTime(0)

    const timeLog: TimeLog = {
      startTime: now,
      activityType,
    }
    saveToLocalStorage(activityType, timeLog, taskId)
  }

  const pauseTracking = () => {
    if (!isTracking || !startTimeRef.current) return

    setIsTracking(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Save paused state
    const timeLog: TimeLog = {
      startTime: startTimeRef.current,
      activityType,
    }
    saveToLocalStorage(activityType, timeLog, taskId)
  }

  const resumeTracking = () => {
    if (isTracking || !startTimeRef.current) return

    setIsTracking(true)
  }

  const stopTracking = () => {
    if (!startTimeRef.current) return

    const now = Date.now()
    const duration = now - startTimeRef.current

    setIsTracking(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const timeLog: TimeLog = {
      startTime: startTimeRef.current,
      endTime: now,
      duration,
      activityType,
    }

    // Clear localStorage
    clearLocalStorage(activityType, taskId)

    // Reset state
    startTimeRef.current = null
    setElapsedTime(0)

    return timeLog
  }

  const saveTimeLog = useMutation({
    mutationFn: async (finalTaskId: string, stopAfterSave = false) => {
      if (!startTimeRef.current) {
        throw new Error("No time log to save")
      }

      const now = Date.now()
      const duration = now - startTimeRef.current

      const timeLog: TimeLog = {
        startTime: startTimeRef.current,
        endTime: now,
        duration,
        activityType,
      }

      const timeLogWithTaskId = {
        ...timeLog,
        taskId: finalTaskId,
      }

      // Save to API if onSave is provided
      if (onSave) {
        await onSave(timeLogWithTaskId)
      }

      // If stopAfterSave is true, stop tracking and reset
      if (stopAfterSave) {
        setIsTracking(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        clearLocalStorage(activityType, taskId)
        startTimeRef.current = null
        setElapsedTime(0)
      } else {
        // Continue tracking - update start time to now for next interval
        startTimeRef.current = now
        setElapsedTime(0)
        // Update localStorage with new start time
        const newTimeLog: TimeLog = {
          startTime: now,
          activityType,
        }
        saveToLocalStorage(activityType, newTimeLog, taskId)
      }

      return timeLogWithTaskId
    },
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const saveTimeLogAndContinue = async (finalTaskId: string) => {
    return saveTimeLog.mutateAsync(finalTaskId, false)
  }

  const saveTimeLogAndStop = async (finalTaskId: string) => {
    return saveTimeLog.mutateAsync(finalTaskId, true)
  }

  return {
    isTracking,
    elapsedTime,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    saveTimeLog: saveTimeLogAndStop, // Default behavior: save and stop
    saveTimeLogAndContinue, // Save but continue tracking
    isSaving: saveTimeLog.isPending,
  }
}
