import { describe, expect, it } from "bun:test"
import {
  formatActivityType,
  formatDate,
  formatDateTime,
  formatDurationBetween,
  formatDurationMs,
  formatRelativeTime,
  formatTime,
} from "./formatting"

describe("formatting", () => {
  describe("formatDateTime", () => {
    it("formats a date string to readable date and time", () => {
      const date = "2024-01-15T14:30:00Z"
      const result = formatDateTime(date)
      expect(result).toMatch(/Jan 15, 2024/)
      expect(result).toMatch(/2:30 PM|14:30/)
    })

    it("formats a Date object to readable date and time", () => {
      const date = new Date("2024-01-15T14:30:00Z")
      const result = formatDateTime(date)
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it("handles different time zones correctly", () => {
      const date = "2024-01-15T00:00:00Z"
      const result = formatDateTime(date)
      expect(result).toContain("Jan 15, 2024")
    })
  })

  describe("formatDate", () => {
    it("formats a date string to short date", () => {
      const date = "2024-01-15T14:30:00Z"
      const result = formatDate(date)
      expect(result).toBe("Jan 15, 2024")
    })

    it("formats a Date object to short date", () => {
      const date = new Date("2024-01-15T14:30:00Z")
      const result = formatDate(date)
      expect(result).toBe("Jan 15, 2024")
    })

    it("handles different months correctly", () => {
      expect(formatDate("2024-12-25T00:00:00Z")).toBe("Dec 25, 2024")
      expect(formatDate("2024-06-01T00:00:00Z")).toBe("Jun 1, 2024")
    })
  })

  describe("formatTime", () => {
    it("formats a date string to time", () => {
      const date = "2024-01-15T14:30:00Z"
      const result = formatTime(date)
      expect(result).toMatch(/2:30 PM|14:30/)
    })

    it("formats a Date object to time", () => {
      const date = new Date("2024-01-15T14:30:00Z")
      const result = formatTime(date)
      expect(result).toMatch(/2:30 PM|14:30/)
    })

    it("handles midnight correctly", () => {
      const date = "2024-01-15T00:00:00Z"
      const result = formatTime(date)
      expect(result).toMatch(/12:00 AM|00:00/)
    })
  })

  describe("formatDurationBetween", () => {
    it("formats duration with hours, minutes, and seconds", () => {
      const start = "2024-01-15T10:00:00Z"
      const end = "2024-01-15T12:30:45Z"
      const result = formatDurationBetween(start, end)
      expect(result).toBe("2h 30m")
    })

    it("formats duration with only minutes and seconds", () => {
      const start = "2024-01-15T10:00:00Z"
      const end = "2024-01-15T10:45:30Z"
      const result = formatDurationBetween(start, end)
      expect(result).toBe("45m 30s")
    })

    it("formats duration with only seconds", () => {
      const start = "2024-01-15T10:00:00Z"
      const end = "2024-01-15T10:00:15Z"
      const result = formatDurationBetween(start, end)
      expect(result).toBe("15s")
    })

    it("handles null endTime by using current time", () => {
      const start = new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
      const result = formatDurationBetween(start, null)
      expect(result).toMatch(/5m/)
    })

    it("returns 0s for zero or very small durations", () => {
      const start = "2024-01-15T10:00:00Z"
      const end = "2024-01-15T10:00:00Z"
      const result = formatDurationBetween(start, end)
      expect(result).toBe("0s")
    })

    it("handles Date objects", () => {
      const start = new Date("2024-01-15T10:00:00Z")
      const end = new Date("2024-01-15T11:30:00Z")
      const result = formatDurationBetween(start, end)
      expect(result).toBe("1h 30m")
    })

    it("does not show seconds when hours are present", () => {
      const start = "2024-01-15T10:00:00Z"
      const end = "2024-01-15T12:30:45Z"
      const result = formatDurationBetween(start, end)
      expect(result).toBe("2h 30m")
      expect(result).not.toContain("s")
    })
  })

  describe("formatDurationMs", () => {
    it("formats milliseconds with hours, minutes, and seconds", () => {
      const ms = 2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000 // 2h 30m 45s
      const result = formatDurationMs(ms)
      expect(result).toBe("2h 30m")
    })

    it("formats milliseconds with only minutes and seconds", () => {
      const ms = 45 * 60 * 1000 + 30 * 1000 // 45m 30s
      const result = formatDurationMs(ms)
      expect(result).toBe("45m 30s")
    })

    it("formats milliseconds with only seconds", () => {
      const ms = 15 * 1000 // 15s
      const result = formatDurationMs(ms)
      expect(result).toBe("15s")
    })

    it("returns 0s for zero milliseconds", () => {
      const result = formatDurationMs(0)
      expect(result).toBe("0s")
    })

    it("returns 0s for negative milliseconds", () => {
      const result = formatDurationMs(-1000)
      expect(result).toBe("0s")
    })

    it("handles very large durations", () => {
      const ms = 24 * 60 * 60 * 1000 + 5 * 60 * 1000 // 24h 5m
      const result = formatDurationMs(ms)
      expect(result).toBe("24h 5m")
    })

    it("does not show seconds when hours are present", () => {
      const ms = 2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000
      const result = formatDurationMs(ms)
      expect(result).toBe("2h 30m")
      expect(result).not.toContain("s")
    })
  })

  describe("formatRelativeTime", () => {
    it("formats relative time without suffix", () => {
      const date = new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
      const result = formatRelativeTime(date)
      expect(result).toMatch(/5 minutes/)
    })

    it("formats relative time with suffix", () => {
      const date = new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
      const result = formatRelativeTime(date, { addSuffix: true })
      expect(result).toContain("ago")
    })

    it("handles date strings", () => {
      const date = new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
      const result = formatRelativeTime(date, { addSuffix: true })
      expect(result).toContain("ago")
    })

    it("handles future dates", () => {
      const date = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
      const result = formatRelativeTime(date, { addSuffix: true })
      expect(result).toContain("in")
    })
  })

  describe("formatActivityType", () => {
    it("formats snake_case to Title Case", () => {
      expect(formatActivityType("task_creation")).toBe("Task Creation")
      expect(formatActivityType("conversation_review")).toBe("Conversation Review")
    })

    it("handles single words", () => {
      expect(formatActivityType("task")).toBe("Task")
    })

    it("handles multiple underscores", () => {
      expect(formatActivityType("very_long_activity_type")).toBe(
        "Very Long Activity Type",
      )
    })

    it("handles already capitalized words", () => {
      expect(formatActivityType("Task_Creation")).toBe("Task Creation")
    })

    it("handles empty string", () => {
      expect(formatActivityType("")).toBe("")
    })

    it("handles single character", () => {
      expect(formatActivityType("a")).toBe("A")
    })

    it("handles words with numbers", () => {
      expect(formatActivityType("task_2_creation")).toBe("Task 2 Creation")
    })
  })

  describe("edge cases", () => {
    it("formatDurationMs handles very small durations", () => {
      expect(formatDurationMs(100)).toBe("0s")
      expect(formatDurationMs(500)).toBe("0s")
    })

    it("formatDurationBetween handles end before start", () => {
      const start = "2024-01-15T12:00:00Z"
      const end = "2024-01-15T10:00:00Z"
      const result = formatDurationBetween(start, end)
      // Should handle negative durations gracefully
      expect(result).toBeDefined()
    })

    it("formatDateTime handles invalid date strings gracefully", () => {
      const invalidDate = new Date("invalid")
      const result = formatDateTime(invalidDate)
      expect(result).toBe("Invalid Date")
    })

    it("formatDateTime handles invalid date strings", () => {
      const result = formatDateTime("invalid-date-string")
      expect(result).toBe("Invalid Date")
    })
  })
})
