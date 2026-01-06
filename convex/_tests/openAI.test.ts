import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock OpenAI and AI SDK
// Use vi.hoisted() to ensure mock functions are available when the mock factory runs
// Store them in a way that's accessible to both the mock factory and the test code
const mocks = vi.hoisted(() => {
  return {
    mockTranscriptionsCreate: vi.fn(),
    mockSpeechCreate: vi.fn(),
    mockGenerateText: vi.fn(),
  }
})

// Export for use in tests
const { mockTranscriptionsCreate, mockSpeechCreate, mockGenerateText } = mocks

// Mock OpenAI - must be hoisted before any imports
// Access the hoisted mocks directly via closure
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

  // Create a class that matches OpenAI's structure
  // This ensures 'new OpenAI()' works correctly
  class MockOpenAI {
    audio: {
      transcriptions: { create: typeof mocks.mockTranscriptionsCreate }
      speech: { create: typeof mocks.mockSpeechCreate }
    }

    constructor(_options: any) {
      // Access mocks directly via closure - vi.hoisted runs before vi.mock
      this.audio = {
        transcriptions: {
          create: mocks.mockTranscriptionsCreate,
        },
        speech: {
          create: mocks.mockSpeechCreate,
        },
      }
    }
  }
  // Attach APIError as a static property
  ;(MockOpenAI as any).APIError = MockAPIError

  return {
    default: MockOpenAI,
    APIError: MockAPIError,
  }
})

// Mock AI SDK - use the hoisted mock function from mocks object
vi.mock("ai", () => {
  return {
    generateText: mocks.mockGenerateText,
  }
})

vi.mock("@ai-sdk/openai", () => {
  return {
    createOpenAI: vi.fn(() => (model: string) => model),
  }
})

import OpenAI from "openai"
import { api } from "../_generated/api"
import { createTestInstance, createTestWithUser } from "./testHelpers"

describe("openAI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mock functions
    mockTranscriptionsCreate.mockReset()
    mockSpeechCreate.mockReset()
    mockGenerateText.mockReset()
  })

  // Helper to set up API key in database
  // Uses the public action which handles encryption internally
  async function setupApiKey(t: ReturnType<typeof createTestWithUser>) {
    await t.action(api.apiKeysActions.saveOpenaiApiKey, {
      apiKey: "test-openai-key-12345",
    })
  }

  describe("improvePrompt", () => {
    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      await expect(
        t.action(api.openAI.improvePrompt, { text: "test prompt" })
      ).rejects.toThrow()
    })

    it("throws error when OpenAI API key not configured", async () => {
      const asUser = createTestWithUser()
      await expect(
        asUser.action(api.openAI.improvePrompt, { text: "test prompt" })
      ).rejects.toThrow("OpenAI API key not configured")
    })

    it("throws error when text is empty", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      await expect(
        asUser.action(api.openAI.improvePrompt, { text: "" })
      ).rejects.toThrow("Text cannot be empty")

      await expect(
        asUser.action(api.openAI.improvePrompt, { text: "   " })
      ).rejects.toThrow("Text cannot be empty")
    })

    it("successfully improves prompt", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockImprovedText = "This is an improved version of the prompt"
      mockGenerateText.mockResolvedValue({
        text: mockImprovedText,
      } as any)

      const result = await asUser.action(api.openAI.improvePrompt, {
        text: "fix bug",
      })

      expect(result.text).toBe(mockImprovedText)
      expect(mockGenerateText).toHaveBeenCalledTimes(1)
      const callArgs = mockGenerateText.mock.calls[0][0]
      expect(callArgs.prompt).toContain("fix bug")
    })

    it("throws error for invalid API key", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const apiError = new OpenAI.APIError(
        401,
        undefined,
        "Invalid API key",
        undefined
      )
      mockGenerateText.mockRejectedValue(apiError)

      await expect(
        asUser.action(api.openAI.improvePrompt, { text: "test prompt" })
      ).rejects.toThrow("Invalid OpenAI API key")
    })

    it("throws error for rate limit", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const apiError = new OpenAI.APIError(
        429,
        undefined,
        "Rate limit exceeded",
        undefined
      )
      mockGenerateText.mockRejectedValue(apiError)

      await expect(
        asUser.action(api.openAI.improvePrompt, { text: "test prompt" })
      ).rejects.toThrow("OpenAI rate limit exceeded")
    })
  })

  describe("transcribeAudio", () => {
    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      await expect(
        t.action(api.openAI.transcribeAudio, {
          audioData: "base64data",
          mimeType: "audio/webm",
        })
      ).rejects.toThrow()
    })

    it("throws error when OpenAI API key not configured", async () => {
      const asUser = createTestWithUser()
      await expect(
        asUser.action(api.openAI.transcribeAudio, {
          audioData: "base64data",
          mimeType: "audio/webm",
        })
      ).rejects.toThrow("OpenAI API key not configured")
    })

    it("successfully transcribes audio", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockTranscription = { text: "Hello world" }
      mockTranscriptionsCreate.mockResolvedValue(mockTranscription)

      const result = await asUser.action(api.openAI.transcribeAudio, {
        audioData: Buffer.from("test audio").toString("base64"),
        mimeType: "audio/webm",
      })

      expect(result.text).toBe("Hello world")
      expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(1)
      const callArgs = mockTranscriptionsCreate.mock.calls[0][0]
      expect(callArgs.model).toBe("whisper-1")
      expect(callArgs.file).toBeInstanceOf(File)
    })

    it("throws error for invalid API key", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const apiError = new OpenAI.APIError(
        401,
        undefined,
        "Invalid API key",
        undefined
      )
      mockTranscriptionsCreate.mockRejectedValue(apiError)

      await expect(
        asUser.action(api.openAI.transcribeAudio, {
          audioData: "base64data",
          mimeType: "audio/webm",
        })
      ).rejects.toThrow("Invalid OpenAI API key")
    })

    it("throws error for rate limit", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const apiError = new OpenAI.APIError(
        429,
        undefined,
        "Rate limit exceeded",
        undefined
      )
      mockTranscriptionsCreate.mockRejectedValue(apiError)

      await expect(
        asUser.action(api.openAI.transcribeAudio, {
          audioData: "base64data",
          mimeType: "audio/webm",
        })
      ).rejects.toThrow("OpenAI rate limit exceeded")
    })
  })

  describe("textToSpeech", () => {
    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      await expect(
        t.action(api.openAI.textToSpeech, { text: "Hello" })
      ).rejects.toThrow()
    })

    it("throws error when OpenAI API key not configured", async () => {
      const asUser = createTestWithUser()
      await expect(
        asUser.action(api.openAI.textToSpeech, { text: "Hello" })
      ).rejects.toThrow("OpenAI API key not configured")
    })

    it("successfully generates speech with default voice", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockAudioBuffer = Buffer.from("mock audio data")
      const mockArrayBuffer = vi.fn().mockResolvedValue(mockAudioBuffer)
      mockSpeechCreate.mockResolvedValue({
        arrayBuffer: mockArrayBuffer,
      })

      const result = await asUser.action(api.openAI.textToSpeech, {
        text: "Hello world",
      })

      expect(result.audioData).toBe(mockAudioBuffer.toString("base64"))
      expect(result.mimeType).toBe("audio/mpeg")
      expect(mockSpeechCreate).toHaveBeenCalledTimes(1)
      const callArgs = mockSpeechCreate.mock.calls[0][0]
      expect(callArgs.model).toBe("tts-1")
      expect(callArgs.voice).toBe("alloy")
      expect(callArgs.input).toBe("Hello world")
    })

    it("successfully generates speech with custom voice", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockAudioBuffer = Buffer.from("mock audio data")
      const mockArrayBuffer = vi.fn().mockResolvedValue(mockAudioBuffer)
      mockSpeechCreate.mockResolvedValue({
        arrayBuffer: mockArrayBuffer,
      })

      const result = await asUser.action(api.openAI.textToSpeech, {
        text: "Hello world",
        voice: "nova",
      })

      expect(result.audioData).toBe(mockAudioBuffer.toString("base64"))
      const callArgs = mockSpeechCreate.mock.calls[0][0]
      expect(callArgs.voice).toBe("nova")
    })

    it("throws error for invalid API key", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const apiError = new OpenAI.APIError(
        401,
        undefined,
        "Invalid API key",
        undefined
      )
      mockSpeechCreate.mockRejectedValue(apiError)

      await expect(
        asUser.action(api.openAI.textToSpeech, { text: "Hello" })
      ).rejects.toThrow("Invalid OpenAI API key")
    })

    it("throws error for rate limit", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const apiError = new OpenAI.APIError(
        429,
        undefined,
        "Rate limit exceeded",
        undefined
      )
      mockSpeechCreate.mockRejectedValue(apiError)

      await expect(
        asUser.action(api.openAI.textToSpeech, { text: "Hello" })
      ).rejects.toThrow("OpenAI rate limit exceeded")
    })
  })

  describe("summarizeConversation", () => {
    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      await expect(
        t.action(api.openAI.summarizeConversation, { agentId: "test-123" })
      ).rejects.toThrow()
    })

    it("throws error when OpenAI API key not configured", async () => {
      const asUser = createTestWithUser()
      await expect(
        asUser.action(api.openAI.summarizeConversation, {
          agentId: "test-123",
        })
      ).rejects.toThrow("OpenAI API key not configured")
    })

    // Note: Testing summarizeConversation fully requires mocking api.cursor.getConversation
    // which is called via ctx.runAction. This is complex to mock in convex-test.
    // These tests verify authentication and API key validation.
    // Full E2E testing of summarizeConversation would require setting up actual
    // agent and conversation data or more sophisticated mocking infrastructure.
  })
})
