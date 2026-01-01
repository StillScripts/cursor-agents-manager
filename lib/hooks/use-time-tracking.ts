"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Simple time tracking hook using only state (no localStorage)
 * Tracks elapsed time in milliseconds
 */
export function useTimeTracking() {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTracking, setIsTracking] = useState(false)
  const [startsAt, setStartsAt] = useState<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Start tracking
  const start = useCallback(() => {
    // Use ref check instead of state to avoid dependency
    if (startTimeRef.current !== null) return

    const now = Date.now()
    startTimeRef.current = now
    setStartsAt(now)
    setIsTracking(true)
    setElapsedTime(0)
  }, [])

  // Stop tracking and return duration
  const stop = useCallback((): number => {
    if (!startTimeRef.current) return 0

    const duration = Date.now() - startTimeRef.current
    setIsTracking(false)
    setStartsAt(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    startTimeRef.current = null
    setElapsedTime(0)

    return duration
  }, [])

  // Get current duration without stopping
  const getDuration = useCallback((): number => {
    if (!startTimeRef.current) return 0
    return Date.now() - startTimeRef.current
  }, [])

  // Update elapsed time while tracking
  useEffect(() => {
    if (isTracking && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Date.now() - startTimeRef.current)
        }
      }, 1000) // Update every second

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [isTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    elapsedTime, // Current elapsed time in ms
    isTracking,
    startsAt, // Timestamp when tracking started (for API calls)
    start,
    stop,
    getDuration,
  }
}
