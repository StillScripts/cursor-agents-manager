import {
  format,
  formatDistanceToNow,
  intervalToDuration,
} from "date-fns"

/**
 * Formats a date string or Date object to a readable date and time string
 * Example: "Jan 15, 2024, 02:30 PM"
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, "MMM d, yyyy, h:mm a")
}

/**
 * Formats a date string or Date object to a short date string
 * Example: "Jan 15, 2024"
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, "MMM d, yyyy")
}

/**
 * Formats a date string or Date object to a time string
 * Example: "02:30 PM"
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, "h:mm a")
}

/**
 * Formats a duration between two dates as a human-readable string
 * Example: "2h 30m" or "45m 30s" or "15s"
 */
export function formatDurationBetween(
  startTime: string | Date,
  endTime: string | Date | null,
): string {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime
  const end = endTime
    ? typeof endTime === "string"
      ? new Date(endTime)
      : endTime
    : new Date()

  const duration = intervalToDuration({ start, end })
  const parts: string[] = []

  if (duration.hours !== undefined && duration.hours > 0) {
    parts.push(`${duration.hours}h`)
  }
  if (duration.minutes !== undefined && duration.minutes > 0) {
    parts.push(`${duration.minutes}m`)
  }
  if (duration.seconds !== undefined && duration.seconds > 0) {
    // Only show seconds if less than an hour
    if (duration.hours === undefined || duration.hours === 0) {
      parts.push(`${duration.seconds}s`)
    }
  }

  // If no parts (duration is 0 or very small), return "0s"
  if (parts.length === 0) {
    return "0s"
  }

  return parts.join(" ")
}

/**
 * Formats a duration in milliseconds as a human-readable string
 * Example: "2h 30m" or "45m 30s" or "15s"
 */
export function formatDurationMs(ms: number): string {
  if (ms < 0) {
    return "0s"
  }

  const duration = intervalToDuration({ start: 0, end: ms })
  const parts: string[] = []

  if (duration.hours !== undefined && duration.hours > 0) {
    parts.push(`${duration.hours}h`)
  }
  if (duration.minutes !== undefined && duration.minutes > 0) {
    parts.push(`${duration.minutes}m`)
  }
  if (duration.seconds !== undefined && duration.seconds > 0) {
    // Only show seconds if less than an hour
    if (duration.hours === undefined || duration.hours === 0) {
      parts.push(`${duration.seconds}s`)
    }
  }

  // If no parts (duration is 0 or very small), return "0s"
  if (parts.length === 0) {
    return "0s"
  }

  return parts.join(" ")
}

/**
 * Formats a date as a relative time string (e.g., "2 hours ago", "in 3 days")
 * Uses date-fns formatDistanceToNow
 */
export function formatRelativeTime(
  date: string | Date,
  options?: { addSuffix?: boolean },
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(dateObj, {
    addSuffix: options?.addSuffix ?? false,
  })
}

/**
 * Formats an activity type from snake_case to Title Case
 * Example: "task_creation" -> "Task Creation"
 */
export function formatActivityType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
