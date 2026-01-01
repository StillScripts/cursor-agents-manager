/**
 * Tests for /api/user routes
 *
 * Note: User routes manage the user's Cursor API key, which determines
 * whether the app operates in simulation mode or live mode.
 * - No API key → simulation mode (mock data)
 * - Valid API key → live mode (calls Cursor API)
 *
 * Tests cover:
 * - Authentication requirement (401 for unauthenticated)
 * - API key management (GET, POST, DELETE /api-key)
 * - Repository management (GET, POST /repositories)
 * - Branch management (GET, POST /branches)
 * - Request validation with Zod
 *
 * Run with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib/__tests__/routes/user.test.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import {
  getMockState,
  resetMockState,
  withoutApiKey,
  withoutAuthentication,
  withValidApiKey,
} from "@/lib/hono/__tests__/setup"
import { userApp } from "@/lib/hono/routes/user"

describe("User Routes", () => {
  beforeEach(() => {
    resetMockState()
  })

  afterEach(() => {
    resetMockState()
  })

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      withoutAuthentication()

      const res = await userApp.request("/api-key")

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("allows authenticated requests", async () => {
      const res = await userApp.request("/api-key")

      expect(res.status).toBe(200)
    })
  })

  // ==========================================================================
  // API Key Routes
  // ==========================================================================

  describe("GET /api-key", () => {
    it("returns hasApiKey: true when user has an API key", async () => {
      // Default state has a valid API key
      withValidApiKey()

      const res = await userApp.request("/api-key")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.hasApiKey).toBe(true)
      expect(data.masked).toBeDefined()
    })

    it("returns hasApiKey: false when user has no API key", async () => {
      // User has no Cursor API key → would be in simulation mode
      withoutApiKey()

      const res = await userApp.request("/api-key")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.hasApiKey).toBe(false)
    })

    it("returns masked API key for display", async () => {
      withValidApiKey("cursor_api_key_abc123")

      const res = await userApp.request("/api-key")

      expect(res.status).toBe(200)
      const data = await res.json()
      // Masked key should show first 8 and last 4 characters
      expect(data.masked).toMatch(/^.{8}\.\.\..{4}$/)
    })
  })

  describe("POST /api-key", () => {
    it("saves a valid API key", async () => {
      const res = await userApp.request("/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "valid_api_key_12345" }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it("rejects API key shorter than 10 characters", async () => {
      const res = await userApp.request("/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "short" }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request without apiKey field", async () => {
      const res = await userApp.request("/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    it("rejects non-string apiKey", async () => {
      const res = await userApp.request("/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: 12345 }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe("DELETE /api-key", () => {
    it("deletes the API key successfully", async () => {
      const res = await userApp.request("/api-key", {
        method: "DELETE",
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  // ==========================================================================
  // Repository Routes
  // ==========================================================================

  describe("GET /repositories", () => {
    it("returns user repositories", async () => {
      const res = await userApp.request("/repositories")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.repositories).toBeArray()
      expect(data.repositories.length).toBe(2)
    })

    it("returns empty array when user has no repositories", async () => {
      const state = getMockState()
      state.dbResults.repositories = []

      const res = await userApp.request("/repositories")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.repositories).toBeArray()
      expect(data.repositories.length).toBe(0)
    })
  })

  describe("POST /repositories", () => {
    it("saves valid repositories", async () => {
      const res = await userApp.request("/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositories: [
            { url: "https://github.com/user/repo1", name: "repo1" },
            { url: "https://github.com/user/repo2", name: "repo2" },
          ],
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.repositories).toBeDefined()
    })

    it("accepts empty repositories array", async () => {
      const res = await userApp.request("/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositories: [] }),
      })

      expect(res.status).toBe(200)
    })

    it("rejects request without repositories field", async () => {
      const res = await userApp.request("/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    it("rejects repositories with missing url", async () => {
      const res = await userApp.request("/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositories: [{ name: "repo1" }],
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects repositories with missing name", async () => {
      const res = await userApp.request("/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositories: [{ url: "https://github.com/user/repo1" }],
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ==========================================================================
  // Branch Routes
  // ==========================================================================

  describe("GET /branches", () => {
    it("returns user branches", async () => {
      const res = await userApp.request("/branches")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.branches).toBeArray()
      expect(data.branches.length).toBe(2)
    })

    it("returns empty array when user has no branches", async () => {
      const state = getMockState()
      state.dbResults.branches = []

      const res = await userApp.request("/branches")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.branches).toBeArray()
      expect(data.branches.length).toBe(0)
    })
  })

  describe("POST /branches", () => {
    it("saves valid branches", async () => {
      const res = await userApp.request("/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branches: [{ name: "main" }, { name: "develop" }],
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.branches).toBeDefined()
    })

    it("accepts empty branches array", async () => {
      const res = await userApp.request("/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branches: [] }),
      })

      expect(res.status).toBe(200)
    })

    it("rejects request without branches field", async () => {
      const res = await userApp.request("/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    it("rejects branches with missing name", async () => {
      const res = await userApp.request("/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branches: [{}],
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ==========================================================================
  // Time Log Routes
  // ==========================================================================

  describe("POST /time-logs", () => {
    it("saves a valid time log", async () => {
      const startTime = Date.now() - 5 * 60 * 1000 // 5 minutes ago

      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_agent123",
          activityType: "task_creation",
          startTime,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it("saves a time log for task_creation activity", async () => {
      const startTime = Date.now() - 3 * 60 * 1000

      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_newtask",
          activityType: "task_creation",
          startTime,
        }),
      })

      expect(res.status).toBe(200)
    })

    it("saves a time log for conversation_review activity", async () => {
      const startTime = Date.now() - 15 * 60 * 1000

      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_existingtask",
          activityType: "conversation_review",
          startTime,
        }),
      })

      expect(res.status).toBe(200)
    })

    it("rejects request without taskId", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "task_creation",
          startTime: Date.now(),
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request with empty taskId", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "",
          activityType: "task_creation",
          startTime: Date.now(),
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request without activityType", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_agent123",
          startTime: Date.now(),
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects invalid activityType", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_agent123",
          activityType: "invalid_type",
          startTime: Date.now(),
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request without startTime", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_agent123",
          activityType: "task_creation",
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects negative startTime", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_agent123",
          activityType: "task_creation",
          startTime: -1000,
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects non-integer startTime", async () => {
      const res = await userApp.request("/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "bc_agent123",
          activityType: "task_creation",
          startTime: "not-a-number",
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe("GET /time-logs", () => {
    it("returns all time logs for authenticated user", async () => {
      const res = await userApp.request("/time-logs")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.timeLogs).toBeArray()
      expect(data.timeLogs.length).toBeGreaterThan(0)
    })

    it("returns time logs filtered by taskId when query param provided", async () => {
      const res = await userApp.request("/time-logs?taskId=bc_agent123")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.timeLogs).toBeArray()
      // All returned logs should have the requested taskId
      data.timeLogs.forEach((log: { taskId: string }) => {
        expect(log.taskId).toBe("bc_agent123")
      })
    })

    it("returns empty array when no time logs exist for user", async () => {
      const state = getMockState()
      state.dbResults.timeLogs = []

      const res = await userApp.request("/time-logs")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.timeLogs).toBeArray()
      expect(data.timeLogs.length).toBe(0)
    })

    it("requires authentication", async () => {
      withoutAuthentication()

      const res = await userApp.request("/time-logs")

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })
  })

  // ==========================================================================
  // Route Not Found
  // ==========================================================================

  describe("Unknown Routes", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await userApp.request("/unknown-route")

      expect(res.status).toBe(404)
    })
  })
})
