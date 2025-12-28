/**
 * Tests for /api/models routes
 *
 * Run with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib/__tests__/routes/models.test.ts
 */

import { afterEach, describe, expect, it } from "bun:test"
import { modelsApp } from "../../routes/models"
import { getMockState, resetMockState } from "../setup"

describe("Models Routes", () => {
  afterEach(() => {
    resetMockState()
  })

  describe("GET /", () => {
    it("returns simulated models when in simulation mode (no API key)", async () => {
      // Clear API keys to trigger simulation mode
      const state = getMockState()
      state.dbResults.apiKeys = []

      const res = await modelsApp.request("/")

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.models).toBeArray()
      expect(data.models).toContain("claude-3-5-sonnet-20241022")
      expect(data.models).toContain("gpt-4o")
    })

    it("returns live models when user has valid API key", async () => {
      // Set up for live mode with a valid API key
      const state = getMockState()
      state.cursorApiResponse = {
        ok: true,
        status: 200,
        data: {
          models: ["claude-3-opus", "gpt-4-turbo"],
        },
      }

      const res = await modelsApp.request("/")

      expect(res.status).toBe(200)
      const data = await res.json()
      // With API key present, should be in live mode
      expect(data.simulation).toBe(false)
    })

    it("handles Cursor API errors gracefully", async () => {
      const state = getMockState()
      state.cursorApiResponse = {
        ok: false,
        status: 500,
        data: { error: "Internal Server Error" },
      }

      const res = await modelsApp.request("/")

      // Should return 500 when API fails in live mode
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })
  })
})
