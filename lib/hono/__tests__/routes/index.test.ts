/**
 * Tests for the main Hono app (app/api/_lib/index.ts)
 *
 * Tests cover:
 * - Health check endpoint
 * - Route mounting verification
 * - Base path configuration
 *
 * Run with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib/__tests__/routes/index.test.ts
 */

import { afterEach, describe, expect, it } from "bun:test"
import app from "@/lib/hono"
import { resetMockState } from "@/lib/hono/__tests__/setup"

describe("Main Hono App", () => {
  afterEach(() => {
    resetMockState()
  })

  // ==========================================================================
  // Health Check
  // ==========================================================================

  describe("GET /api/health", () => {
    it("returns health status", async () => {
      const res = await app.request("/api/health")

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe("ok")
      expect(data.timestamp).toBeDefined()
    })

    it("returns valid ISO timestamp", async () => {
      const res = await app.request("/api/health")

      const data = await res.json()
      const timestamp = new Date(data.timestamp)
      expect(timestamp.toISOString()).toBe(data.timestamp)
    })
  })

  // ==========================================================================
  // Route Mounting
  // ==========================================================================

  describe("Route Mounting", () => {
    it("mounts agents routes at /api/agents", async () => {
      // This will fail auth but proves the route is mounted
      const res = await app.request("/api/agents")
      // Should get 401 (auth required) not 404 (not found)
      expect([200, 401]).toContain(res.status)
    })

    it("mounts user routes at /api/user", async () => {
      const res = await app.request("/api/user/api-key")
      expect([200, 401]).toContain(res.status)
    })

    it("mounts models routes at /api/models", async () => {
      const res = await app.request("/api/models")
      expect([200, 401]).toContain(res.status)
    })
  })

  // ==========================================================================
  // Base Path
  // ==========================================================================

  describe("Base Path", () => {
    it("requires /api prefix for all routes", async () => {
      // Without /api prefix, should get 404
      const res = await app.request("/health")
      expect(res.status).toBe(404)
    })

    it("returns 404 for unknown routes under /api", async () => {
      const res = await app.request("/api/unknown-route")
      expect(res.status).toBe(404)
    })
  })
})
