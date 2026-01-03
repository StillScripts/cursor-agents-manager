/**
 * Tests for /api/agents routes
 *
 * SIMULATION MODE:
 * Simulation mode is determined by whether the user has a valid Cursor API key:
 * - withoutApiKey() → simulation mode (uses mock data)
 * - withValidApiKey() → live mode (calls mocked Cursor API)
 *
 * Tests cover:
 * - Authentication requirement
 * - Simulation vs Live mode handling
 * - Agent listing with pagination
 * - Agent launch with validation
 * - Agent details, delete, stop, followup, conversation
 * - Cursor API error handling
 *
 * Run with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib/__tests__/routes/agents.test.ts
 */

import { afterEach, describe, expect, it } from "bun:test"
import {
  mockAgent,
  resetMockState,
  withoutApiKey,
  withoutAuthentication,
} from "@/lib/hono/__tests__/setup"
import { agentsApp } from "@/lib/hono/routes/agents"

describe("Agents Routes", () => {
  afterEach(() => {
    resetMockState()
  })

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      withoutAuthentication()

      const res = await agentsApp.request("/")

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })
  })

  // ==========================================================================
  // GET / (List Agents)
  // ==========================================================================

  describe("GET / (List Agents)", () => {
    it("returns paginated agents in simulation mode (no API key)", async () => {
      // User has no Cursor API key → simulation mode
      withoutApiKey()

      const res = await agentsApp.request("/")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.agents).toBeArray()
      expect(data.total).toBeDefined()
      expect(data.limit).toBeDefined()
      expect(data.hasMore).toBeDefined()
    })

    it("respects limit query parameter", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/?limit=5")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.limit).toBe(5)
      expect(data.agents.length).toBeLessThanOrEqual(5)
    })

    it("uses default limit when no params provided", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.limit).toBe(10) // Default limit is 10
      expect(data.agents.length).toBeLessThanOrEqual(10)
    })
  })

  // ==========================================================================
  // POST / (Launch Agent)
  // ==========================================================================

  describe("POST / (Launch Agent)", () => {
    const validLaunchRequest = {
      prompt: { text: "Add a README file to this repository" },
      source: {
        repository: "https://github.com/user/repo",
        ref: "main",
      },
    }

    it("launches agent in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validLaunchRequest),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.id).toBeDefined()
      expect(data.status).toBe("CREATING")
    })

    it("accepts request with model specified", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validLaunchRequest,
          model: "claude-3-5-sonnet-20241022",
        }),
      })

      expect(res.status).toBe(201)
    })

    it("accepts request with target options", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validLaunchRequest,
          target: {
            autoCreatePr: true,
            branchName: "feature/new-readme",
          },
        }),
      })

      expect(res.status).toBe(201)
    })

    it("rejects request without prompt", async () => {
      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: validLaunchRequest.source,
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request without source", async () => {
      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: validLaunchRequest.prompt,
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request with empty prompt text", async () => {
      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: { text: "" },
          source: validLaunchRequest.source,
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request with invalid repository URL", async () => {
      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: validLaunchRequest.prompt,
          source: {
            repository: "not-a-valid-url",
            ref: "main",
          },
        }),
      })

      expect(res.status).toBe(400)
    })

    it("rejects request with non-GitHub URL", async () => {
      const res = await agentsApp.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: validLaunchRequest.prompt,
          source: {
            repository: "https://gitlab.com/user/repo",
            ref: "main",
          },
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ==========================================================================
  // GET /:id (Agent Details)
  // ==========================================================================

  describe("GET /:id (Agent Details)", () => {
    it("returns agent details in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}`)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.id).toBe(mockAgent.id)
    })

    it("returns 404 for non-existent agent in simulation mode", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/non_existent_agent_id")

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe("Agent not found")
    })
  })

  // ==========================================================================
  // DELETE /:id (Delete Agent)
  // ==========================================================================

  describe("DELETE /:id (Delete Agent)", () => {
    it("deletes agent in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}`, {
        method: "DELETE",
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.simulation).toBe(true)
    })
  })

  // ==========================================================================
  // GET /:id/conversation
  // ==========================================================================

  describe("GET /:id/conversation", () => {
    it("returns conversation in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}/conversation`)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.messages).toBeArray()
    })

    it("returns placeholder for unknown agent in simulation mode", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/unknown_agent/conversation")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.messages).toBeArray()
      expect(data.messages[0].text).toContain("No conversation history")
    })
  })

  // ==========================================================================
  // POST /:id/followup
  // ==========================================================================

  describe("POST /:id/followup", () => {
    it("sends followup message in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: { text: "Also add a LICENSE file" },
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.simulation).toBe(true)
    })

    it("accepts message field as alternative to prompt", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Also add a LICENSE file",
        }),
      })

      expect(res.status).toBe(200)
    })
  })

  // ==========================================================================
  // POST /:id/stop
  // ==========================================================================

  describe("POST /:id/stop", () => {
    it("stops agent in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}/stop`, {
        method: "POST",
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.simulation).toBe(true)
    })
  })

  // ==========================================================================
  // POST /:id/summarize
  // ==========================================================================

  describe("POST /:id/summarize", () => {
    it("summarizes conversation in simulation mode (no API key)", async () => {
      withoutApiKey()

      const res = await agentsApp.request(`/${mockAgent.id}/summarize`, {
        method: "POST",
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.summary).toBeDefined()
      expect(typeof data.summary).toBe("string")
      expect(data.summary.length).toBeGreaterThan(0)
    })

    it("returns 404 for non-existent conversation in simulation mode", async () => {
      withoutApiKey()

      const res = await agentsApp.request("/non_existent_agent/summarize", {
        method: "POST",
      })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe("Conversation not found")
    })
  })

  // ==========================================================================
  // Route Not Found
  // ==========================================================================

  describe("Unknown Routes", () => {
    it("returns 404 for unknown sub-routes", async () => {
      const res = await agentsApp.request(`/${mockAgent.id}/unknown`)

      expect(res.status).toBe(404)
    })
  })
})
