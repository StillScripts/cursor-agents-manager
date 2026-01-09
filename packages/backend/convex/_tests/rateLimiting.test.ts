/**
 * Rate Limiting Tests
 *
 * Tests verify that rate limiting works correctly for both Cursor and OpenAI endpoints:
 * 1. Requests within the rate limit (including burst capacity) succeed
 * 2. Requests exceeding the rate limit are rejected with appropriate error messages
 * 3. Rate limits are isolated per user (different users have independent limits)
 *
 * Note: Rate limiting uses a token bucket algorithm with both a rate (requests per minute)
 * and a capacity (burst allowance). The exact number of requests that succeed before
 * hitting the limit depends on timing, so tests verify that some requests succeed
 * and eventually rate limiting kicks in.
 */

// Ensure ENCRYPTION_SECRET is set for CI environments
if (
  !process.env.ENCRYPTION_SECRET ||
  process.env.ENCRYPTION_SECRET.length < 32
) {
  process.env.ENCRYPTION_SECRET =
    "test-encryption-secret-key-for-testing-only-32-chars-min"
}

import { beforeEach, describe, expect, it, vi } from "vitest"

// Extend globalThis to store our mocks
declare global {
  // eslint-disable-next-line no-var
  var __rateLimitingTestMocks: {
    fetch: ReturnType<typeof vi.fn>
    generateText: ReturnType<typeof vi.fn>
  }
}

// Initialize the global mocks object
globalThis.__rateLimitingTestMocks = {
  fetch: vi.fn(),
  generateText: vi.fn(),
}

// Mock fetch for Cursor API calls
vi.mock("node-fetch", () => ({
  default: globalThis.__rateLimitingTestMocks.fetch,
}))

// Mock global fetch
global.fetch = globalThis.__rateLimitingTestMocks.fetch

// Mock AI SDK
vi.mock("ai", () => {
  return {
    generateText: globalThis.__rateLimitingTestMocks.generateText,
  }
})

vi.mock("@ai-sdk/openai", () => {
  return {
    createOpenAI: vi.fn(() => (model: string) => model),
  }
})

// Mock OpenAI
vi.mock("openai", () => {
  class MockAPIError extends Error {
    status: number

    constructor(
      status: number,
      _error: any,
      message: string | undefined,
      _headers: any
    ) {
      super(message)
      this.name = "APIError"
      this.status = status
    }
  }

  class MockOpenAI {
    audio: {
      transcriptions: { create: ReturnType<typeof vi.fn> }
      speech: { create: ReturnType<typeof vi.fn> }
    }

    constructor(_options: any) {
      this.audio = {
        transcriptions: {
          create: vi.fn().mockResolvedValue({ text: "transcribed text" }),
        },
        speech: {
          create: vi.fn().mockResolvedValue({
            arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("audio data")),
          }),
        },
      }
    }
  }
  ;(MockOpenAI as any).APIError = MockAPIError

  return {
    default: MockOpenAI,
    APIError: MockAPIError,
  }
})

import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "../../lib/convex-test-helpers"
import { api } from "../_generated/api"

// Helper getters for mock functions
const getMockFetch = () => globalThis.__rateLimitingTestMocks.fetch
const getMockGenerateText = () => globalThis.__rateLimitingTestMocks.generateText

describe("rateLimiting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMockFetch().mockReset()
    getMockGenerateText().mockReset()
  })

  // Helper to set up Cursor API key
  async function setupCursorApiKey(t: ReturnType<typeof createTestWithUser>) {
    await t.action(api.apiKeysActions.saveCursorApiKey, {
      apiKey: "test-cursor-key-12345",
    })
  }

  // Helper to set up OpenAI API key
  async function setupOpenAIApiKey(t: ReturnType<typeof createTestWithUser>) {
    await t.action(api.apiKeysActions.saveOpenaiApiKey, {
      apiKey: "test-openai-key-12345",
    })
  }

  describe("Cursor API rate limiting", () => {
    describe("launchAgent", () => {
      it("allows requests up to the rate limit (including burst capacity)", async () => {
        const asUser = createTestWithUser()
        await setupCursorApiKey(asUser)

        // Mock successful Cursor API responses
        getMockFetch().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: "agent-123",
            name: "Test Agent",
            status: "RUNNING",
            source: { repository: "https://github.com/user/repo", ref: "main" },
            target: {},
            createdAt: new Date().toISOString(),
          }),
        })

        // Launch agent up to capacity (3) + a few more within rate limit (5 RPM)
        // Capacity is 3, so we can make 3 immediate requests, then 5 per minute
        // Total: 3 (burst) + 5 (rate) = 8 requests should succeed
        // But to be safe, let's test with capacity (3) + 2 more = 5 total
        const requestsToTest = 5 // capacity (3) + 2 more
        const promises = []
        for (let i = 0; i < requestsToTest; i++) {
          promises.push(
            asUser.action(api.cursor.launchAgent, {
              prompt: { text: `Test prompt ${i}` },
              source: { repository: "https://github.com/user/repo" },
            })
          )
        }

        const results = await Promise.all(promises)
        expect(results).toHaveLength(requestsToTest)
        results.forEach((result) => {
          expect(result.id).toBeDefined()
          expect(result.simulation).toBe(false)
        })
      })

      it("rejects requests exceeding the rate limit", async () => {
        const asUser = createTestWithUser()
        await setupCursorApiKey(asUser)

        // Mock successful Cursor API responses
        getMockFetch().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: "agent-123",
            name: "Test Agent",
            status: "RUNNING",
            source: { repository: "https://github.com/user/repo", ref: "main" },
            target: {},
            createdAt: new Date().toISOString(),
          }),
        })

        // Launch agent multiple times to exhaust the rate limit
        // Capacity is 3, rate is 5 per minute
        // Making 10 requests should exceed the limit (3 burst + 5 rate = 8 max in first minute)
        // But token bucket refills gradually, so let's make enough requests to definitely exceed
        const requestsToExhaust = 10
        let lastError: Error | null = null
        let successCount = 0

        for (let i = 0; i < requestsToExhaust; i++) {
          try {
            await asUser.action(api.cursor.launchAgent, {
              prompt: { text: `Test prompt ${i}` },
              source: { repository: "https://github.com/user/repo" },
            })
            successCount++
          } catch (error) {
            lastError = error as Error
            // Once we hit rate limit, stop trying
            break
          }
        }

        // Should have succeeded for some requests, then hit rate limit
        expect(successCount).toBeGreaterThan(0)
        expect(lastError).not.toBeNull()
        expect(lastError?.message).toContain("Rate limit exceeded")
      })

      it("isolates rate limits per user", async () => {
        const [user1, user2] = createTestUsers([
          { name: "User 1" },
          { name: "User 2" },
        ])

        await setupCursorApiKey(user1)
        await setupCursorApiKey(user2)

        // Mock successful Cursor API responses
        getMockFetch().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: "agent-123",
            name: "Test Agent",
            status: "RUNNING",
            source: { repository: "https://github.com/user/repo", ref: "main" },
            target: {},
            createdAt: new Date().toISOString(),
          }),
        })

        // User 1 exhausts their rate limit (make enough requests to hit the limit)
        const requestsToExhaust = 10
        for (let i = 0; i < requestsToExhaust; i++) {
          try {
            await user1.action(api.cursor.launchAgent, {
              prompt: { text: `User 1 prompt ${i}` },
              source: { repository: "https://github.com/user/repo" },
            })
          } catch {
            // Expected to hit rate limit eventually
            break
          }
        }

        // User 2 should still be able to make requests (independent rate limit)
        const result = await user2.action(api.cursor.launchAgent, {
          prompt: { text: "User 2 prompt" },
          source: { repository: "https://github.com/user/repo" },
        })

        expect(result.id).toBeDefined()
        expect(result.simulation).toBe(false)
      })
    })

    describe("getModels", () => {
      it("allows requests up to the rate limit (including burst capacity)", async () => {
        const asUser = createTestWithUser()
        await setupCursorApiKey(asUser)

        // Mock successful Cursor API responses for models
        getMockFetch().mockResolvedValue({
          ok: true,
          json: async () => ({
            models: ["gpt-4", "gpt-4o", "claude-3-5-sonnet"],
          }),
        })

        // Get models up to capacity (5) + a few more within rate limit (10 RPM)
        // Capacity is 5, rate is 10 per minute
        const requestsToTest = 10 // capacity (5) + 5 more
        const promises = []
        for (let i = 0; i < requestsToTest; i++) {
          promises.push(asUser.action(api.cursor.getModels, {}))
        }

        const results = await Promise.all(promises)
        expect(results).toHaveLength(requestsToTest)
        results.forEach((result) => {
          expect(result.models).toBeDefined()
          expect(Array.isArray(result.models)).toBe(true)
        })
      })

      it("rejects requests exceeding the rate limit", async () => {
        const asUser = createTestWithUser()
        await setupCursorApiKey(asUser)

        // Mock successful Cursor API responses for models
        getMockFetch().mockResolvedValue({
          ok: true,
          json: async () => ({
            models: ["gpt-4", "gpt-4o", "claude-3-5-sonnet"],
          }),
        })

        // Get models multiple times to exhaust the rate limit
        // Capacity is 5, rate is 10 per minute
        // Making 20 requests should exceed the limit
        const requestsToExhaust = 20
        let lastError: Error | null = null
        let successCount = 0

        for (let i = 0; i < requestsToExhaust; i++) {
          try {
            await asUser.action(api.cursor.getModels, {})
            successCount++
          } catch (error) {
            lastError = error as Error
            // Once we hit rate limit, stop trying
            break
          }
        }

        // Should have succeeded for some requests, then hit rate limit
        expect(successCount).toBeGreaterThan(0)
        expect(lastError).not.toBeNull()
        expect(lastError?.message).toContain("Rate limit exceeded")
      })
    })
  })

  describe("OpenAI API rate limiting", () => {
    describe("improvePrompt", () => {
      it("allows requests up to the rate limit", async () => {
        const asUser = createTestWithUser()
        await setupOpenAIApiKey(asUser)

        // Mock successful OpenAI responses
        getMockGenerateText().mockResolvedValue({
          text: "Improved prompt text",
        } as any)

        // Improve prompt 10 times (the rate limit) - all should succeed
        const limit = 10
        const promises = []
        for (let i = 0; i < limit; i++) {
          promises.push(
            asUser.action(api.openAI.improvePrompt, {
              text: `Test prompt ${i}`,
            })
          )
        }

        const results = await Promise.all(promises)
        expect(results).toHaveLength(limit)
        results.forEach((result) => {
          expect(result.text).toBe("Improved prompt text")
        })
      })

      it("rejects requests exceeding the rate limit", async () => {
        const asUser = createTestWithUser()
        await setupOpenAIApiKey(asUser)

        // Mock successful OpenAI responses
        getMockGenerateText().mockResolvedValue({
          text: "Improved prompt text",
        } as any)

        // Improve prompt up to the limit (should succeed)
        const limit = 10
        for (let i = 0; i < limit; i++) {
          await asUser.action(api.openAI.improvePrompt, {
            text: `Test prompt ${i}`,
          })
        }

        // One more request should fail with rate limit error
        await expect(
          asUser.action(api.openAI.improvePrompt, {
            text: "One more prompt",
          })
        ).rejects.toThrow("Rate limit exceeded")
      })

      it("isolates rate limits per user", async () => {
        const [user1, user2] = createTestUsers([
          { name: "User 1" },
          { name: "User 2" },
        ])

        await setupOpenAIApiKey(user1)
        await setupOpenAIApiKey(user2)

        // Mock successful OpenAI responses
        getMockGenerateText().mockResolvedValue({
          text: "Improved prompt text",
        } as any)

        // User 1 exhausts their rate limit (make enough requests to hit the limit)
        const requestsToExhaust = 15
        for (let i = 0; i < requestsToExhaust; i++) {
          try {
            await user1.action(api.openAI.improvePrompt, {
              text: `User 1 prompt ${i}`,
            })
          } catch {
            // Expected to hit rate limit eventually
            break
          }
        }

        // User 2 should still be able to make requests (independent rate limit)
        const result = await user2.action(api.openAI.improvePrompt, {
          text: "User 2 prompt",
        })

        expect(result.text).toBe("Improved prompt text")
      })
    })

    describe("summarizeConversation", () => {
      it("allows requests up to the rate limit", async () => {
        const asUser = createTestWithUser()
        await setupOpenAIApiKey(asUser)
        await setupCursorApiKey(asUser)

        // Mock Cursor API conversation response
        getMockFetch().mockImplementation((url: string) => {
          if (url.includes("/conversation")) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                id: "conv-123",
                messages: [
                  {
                    id: "msg-1",
                    type: "user_message",
                    text: "Hello",
                  },
                  {
                    id: "msg-2",
                    type: "assistant_message",
                    text: "Hi there!",
                  },
                ],
              }),
            })
          }
          return Promise.reject(new Error("Unexpected URL"))
        })

        // Mock OpenAI summary generation
        getMockGenerateText().mockResolvedValue({
          text: "Conversation summary",
        } as any)

        // Summarize conversation up to capacity (2) + 1 more within rate limit (3 RPM)
        // Capacity is 2, rate is 3 per minute
        const requestsToTest = 3 // capacity (2) + 1 more
        const promises = []
        for (let i = 0; i < requestsToTest; i++) {
          promises.push(
            asUser.action(api.openAI.summarizeConversation, {
              agentId: `agent-${i}`,
            })
          )
        }

        const results = await Promise.all(promises)
        expect(results).toHaveLength(requestsToTest)
        results.forEach((result) => {
          expect(result.summary).toBe("Conversation summary")
        })
      })

      it("rejects requests exceeding the rate limit", async () => {
        const asUser = createTestWithUser()
        await setupOpenAIApiKey(asUser)
        await setupCursorApiKey(asUser)

        // Mock Cursor API conversation response
        getMockFetch().mockImplementation((url: string) => {
          if (url.includes("/conversation")) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                id: "conv-123",
                messages: [
                  {
                    id: "msg-1",
                    type: "user_message",
                    text: "Hello",
                  },
                  {
                    id: "msg-2",
                    type: "assistant_message",
                    text: "Hi there!",
                  },
                ],
              }),
            })
          }
          return Promise.reject(new Error("Unexpected URL"))
        })

        // Mock OpenAI summary generation
        getMockGenerateText().mockResolvedValue({
          text: "Conversation summary",
        } as any)

        // Summarize conversation multiple times to exhaust the rate limit
        // Capacity is 2, rate is 3 per minute
        // Making 6 requests should exceed the limit
        const requestsToExhaust = 6
        let lastError: Error | null = null
        let successCount = 0

        for (let i = 0; i < requestsToExhaust; i++) {
          try {
            await asUser.action(api.openAI.summarizeConversation, {
              agentId: `agent-${i}`,
            })
            successCount++
          } catch (error) {
            lastError = error as Error
            // Once we hit rate limit, stop trying
            break
          }
        }

        // Should have succeeded for some requests, then hit rate limit
        expect(successCount).toBeGreaterThan(0)
        expect(lastError).not.toBeNull()
        expect(lastError?.message).toContain("Rate limit exceeded")
      })
    })
  })
})
