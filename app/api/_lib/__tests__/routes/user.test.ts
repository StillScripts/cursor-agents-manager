/**
 * Tests for /api/user routes
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
import { userApp } from "../../routes/user"
import { getMockState, resetMockState } from "../setup"

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
      const state = getMockState()
      state.authenticated = false

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
      const res = await userApp.request("/api-key")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.hasApiKey).toBe(true)
      expect(data.masked).toBeDefined()
    })

    it("returns hasApiKey: false when user has no API key", async () => {
      const state = getMockState()
      state.dbResults.apiKeys = []

      const res = await userApp.request("/api-key")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.hasApiKey).toBe(false)
    })

    it("returns masked API key for display", async () => {
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
  // Route Not Found
  // ==========================================================================

  describe("Unknown Routes", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await userApp.request("/unknown-route")

      expect(res.status).toBe(404)
    })
  })
})
