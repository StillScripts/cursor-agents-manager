import { format, formatDistanceToNow, intervalToDuration } from "date-fns"

/**
 * Formats a date string or Date object to a readable date and time string
 * Example: "Jan 15, 2024, 02:30 PM"
 * @param date - The date to format
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  // Check if date is invalid
  if (Number.isNaN(dateObj.getTime())) {
    return "Invalid Date"
  }

  return format(dateObj, "MMM d, yyyy, h:mm a")
}

/**
 * Formats a date string or Date object to a short date string
 * Example: "Jan 15, 2024"
 * @param date - The date to format
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  // Check if date is invalid
  if (Number.isNaN(dateObj.getTime())) {
    return "Invalid Date"
  }

  return format(dateObj, "MMM d, yyyy")
}

/**
 * Formats a date string or Date object to a time string
 * Example: "02:30 PM"
 * @param date - The date to format
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  // Check if date is invalid
  if (Number.isNaN(dateObj.getTime())) {
    return "Invalid Date"
  }

  return format(dateObj, "h:mm a")
}

/**
 * Formats a duration between two dates as a human-readable string
 * Example: "2h 30m" or "45m 30s" or "15s"
 * @param startTime - The start time
 * @param endTime - The end time
 */
export function formatDurationBetween(
  startTime: string | Date,
  endTime: string | Date | null
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
 * @param ms - The duration in milliseconds
 */
export function formatDurationMs(ms: number): string {
  if (ms < 0) {
    return "0s"
  }

  // Calculate duration components directly from milliseconds
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}h`)
    const remainingMinutes = minutes % 60
    if (remainingMinutes > 0) {
      parts.push(`${remainingMinutes}m`)
    }
  } else if (minutes > 0) {
    parts.push(`${minutes}m`)
    const remainingSeconds = seconds % 60
    if (remainingSeconds > 0) {
      parts.push(`${remainingSeconds}s`)
    }
  } else if (seconds > 0) {
    parts.push(`${seconds}s`)
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
 * @param date - The date to format
 * @param options - The options to pass to date-fns formatDistanceToNow
 */
export function formatRelativeTime(
  date: string | Date,
  options?: { addSuffix?: boolean }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  // Check if date is invalid
  if (Number.isNaN(dateObj.getTime())) {
    return "Invalid Date"
  }

  return formatDistanceToNow(dateObj, {
    addSuffix: options?.addSuffix ?? false,
  })
}

/**
 * Formats an activity type from snake_case to Title Case
 * Example: "task_creation" -> "Task Creation"
 * @param type - The activity type
 */
export function formatActivityType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Safely pass a GitHub url and extract the name
 * @param url - The GitHub url
 */
export function parseGitHubUrl(
  url: string
): { url: string; name: string } | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.hostname !== "github.com") return null

    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null

    return {
      url: url.trim(),
      name: parts[1].replace(/\.git$/, ""), // Remove .git suffix if present
    }
  } catch {
    return null
  }
}
