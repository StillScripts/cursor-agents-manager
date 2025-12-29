/**
 * Tests for /api/models routes
 *
 * SIMULATION MODE:
 * - withoutApiKey() → simulation mode (returns hardcoded model list)
 * - withValidApiKey() → live mode (calls mocked Cursor API)
 *
 * Run with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib/__tests__/routes/models.test.ts
 */

import { afterEach, describe, expect, it } from "bun:test"
import { modelsApp } from "../../routes/models"
import {
  resetMockState,
  setCursorApiError,
  setCursorApiResponse,
  withoutApiKey,
  withValidApiKey,
} from "../setup"

describe("Models Routes", () => {
  afterEach(() => {
    resetMockState()
  })

  describe("GET /", () => {
    it("returns simulated models when user has no API key", async () => {
      // User has no Cursor API key → simulation mode
      withoutApiKey()

      const res = await modelsApp.request("/")

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.simulation).toBe(true)
      expect(data.models).toBeArray()
      expect(data.models).toContain("claude-3-5-sonnet-20241022")
      expect(data.models).toContain("gpt-4o")
    })

    it("calls Cursor API when user has valid API key", async () => {
      // User has valid Cursor API key → live mode
      withValidApiKey("my-cursor-api-key-12345")

      // Set up the expected response from Cursor API
      setCursorApiResponse({
        models: ["claude-3-opus", "gpt-4-turbo"],
      })

      const res = await modelsApp.request("/")

      expect(res.status).toBe(200)
      const data = await res.json()
      // With API key present, should be in live mode
      expect(data.simulation).toBe(false)
    })

    it("handles Cursor API errors gracefully in live mode", async () => {
      // User has API key → live mode, but API fails
      withValidApiKey()
      setCursorApiError(500)

      const res = await modelsApp.request("/")

      // Should return 500 when API fails in live mode
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })
  })
})
