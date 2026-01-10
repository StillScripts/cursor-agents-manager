// Ensure ENCRYPTION_SECRET is set for CI environments
// This must be before any imports that might use encryption
if (
  !process.env.ENCRYPTION_SECRET ||
  process.env.ENCRYPTION_SECRET.length < 32
) {
  process.env.ENCRYPTION_SECRET =
    "test-encryption-secret-key-for-testing-only-32-chars-min"
}

import { beforeEach, describe, expect, it, vi } from "vitest"

// Extend globalThis to store our mocks - avoids vi.hoisted() which isn't available in all environments
declare global {
  // eslint-disable-next-line no-var
  var __openAITestMocks: {
    transcriptionsCreate: ReturnType<typeof vi.fn>
    speechCreate: ReturnType<typeof vi.fn>
    generateText: ReturnType<typeof vi.fn>
  }
}

// Initialize the global mocks object
globalThis.__openAITestMocks = {
  transcriptionsCreate: vi.fn(),
  speechCreate: vi.fn(),
  generateText: vi.fn(),
}

// Mock OpenAI - uses globalThis to access mocks since vi.mock is hoisted
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
  class MockOpenAI {
    audio: {
      transcriptions: { create: ReturnType<typeof vi.fn> }
      speech: { create: ReturnType<typeof vi.fn> }
    }

    constructor(_options: any) {
      // Access mocks via globalThis - always available
      this.audio = {
        transcriptions: {
          create: globalThis.__openAITestMocks.transcriptionsCreate,
        },
        speech: {
          create: globalThis.__openAITestMocks.speechCreate,
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

// Mock AI SDK - uses globalThis to access mocks
vi.mock("ai", () => {
  return {
    generateText: globalThis.__openAITestMocks.generateText,
  }
})

vi.mock("@ai-sdk/openai", () => {
  return {
    createOpenAI: vi.fn(() => (model: string) => model),
  }
})

import OpenAI from "openai"
import {
  createTestInstance,
  createTestWithUser,
} from "../lib/convex-test-helpers"
import { api } from "../convex/_generated/api"

// Helper getters for mock functions - access via globalThis
const getMockTranscriptionsCreate = () =>
  globalThis.__openAITestMocks.transcriptionsCreate
const getMockSpeechCreate = () => globalThis.__openAITestMocks.speechCreate
const getMockGenerateText = () => globalThis.__openAITestMocks.generateText

describe("openAI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mock functions
    getMockTranscriptionsCreate().mockReset()
    getMockSpeechCreate().mockReset()
    getMockGenerateText().mockReset()
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

    it("successfully improves prompt with branch name", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockResponse = `IMPROVED_DESCRIPTION:
This is an improved version of the prompt

BRANCH_NAME:
hotfix/fix-bug`
      getMockGenerateText().mockResolvedValue({
        text: mockResponse,
      } as any)

      const result = await asUser.action(api.openAI.improvePrompt, {
        text: "fix bug",
      })

      expect(result.text).toBe("This is an improved version of the prompt")
      expect(result.branchName).toBe("hotfix/fix-bug")
      expect(getMockGenerateText()).toHaveBeenCalledTimes(1)
      const callArgs = getMockGenerateText().mock.calls[0][0]
      expect(callArgs.prompt).toContain("fix bug")
    })

    it("successfully improves prompt with feature branch name", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockResponse = `IMPROVED_DESCRIPTION:
Add user authentication feature with login and signup

BRANCH_NAME:
feature/add-user-authentication`
      getMockGenerateText().mockResolvedValue({
        text: mockResponse,
      } as any)

      const result = await asUser.action(api.openAI.improvePrompt, {
        text: "add login",
      })

      expect(result.text).toBe(
        "Add user authentication feature with login and signup"
      )
      expect(result.branchName).toBe("feature/add-user-authentication")
    })

    it("handles response without structured format", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockResponse =
        "This is an improved version without structured format"
      getMockGenerateText().mockResolvedValue({
        text: mockResponse,
      } as any)

      const result = await asUser.action(api.openAI.improvePrompt, {
        text: "test",
      })

      expect(result.text).toBe(mockResponse)
      expect(result.branchName).toBeUndefined()
    })

    it("ignores invalid branch name format", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockResponse = `IMPROVED_DESCRIPTION:
Improved text

BRANCH_NAME:
invalid-branch-name`
      getMockGenerateText().mockResolvedValue({
        text: mockResponse,
      } as any)

      const result = await asUser.action(api.openAI.improvePrompt, {
        text: "test",
      })

      expect(result.text).toBe("Improved text")
      expect(result.branchName).toBeUndefined()
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
      getMockGenerateText().mockRejectedValue(apiError)

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
      getMockGenerateText().mockRejectedValue(apiError)

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
      getMockTranscriptionsCreate().mockResolvedValue(mockTranscription)

      const result = await asUser.action(api.openAI.transcribeAudio, {
        audioData: Buffer.from("test audio").toString("base64"),
        mimeType: "audio/webm",
      })

      expect(result.text).toBe("Hello world")
      expect(getMockTranscriptionsCreate()).toHaveBeenCalledTimes(1)
      const callArgs = getMockTranscriptionsCreate().mock.calls[0][0]
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
      getMockTranscriptionsCreate().mockRejectedValue(apiError)

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
      getMockTranscriptionsCreate().mockRejectedValue(apiError)

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
      getMockSpeechCreate().mockResolvedValue({
        arrayBuffer: mockArrayBuffer,
      })

      const result = await asUser.action(api.openAI.textToSpeech, {
        text: "Hello world",
      })

      expect(result.audioData).toBe(mockAudioBuffer.toString("base64"))
      expect(result.mimeType).toBe("audio/mpeg")
      expect(getMockSpeechCreate()).toHaveBeenCalledTimes(1)
      const callArgs = getMockSpeechCreate().mock.calls[0][0]
      expect(callArgs.model).toBe("tts-1")
      expect(callArgs.voice).toBe("alloy")
      expect(callArgs.input).toBe("Hello world")
    })

    it("successfully generates speech with custom voice", async () => {
      const asUser = createTestWithUser()
      await setupApiKey(asUser)

      const mockAudioBuffer = Buffer.from("mock audio data")
      const mockArrayBuffer = vi.fn().mockResolvedValue(mockAudioBuffer)
      getMockSpeechCreate().mockResolvedValue({
        arrayBuffer: mockArrayBuffer,
      })

      const result = await asUser.action(api.openAI.textToSpeech, {
        text: "Hello world",
        voice: "nova",
      })

      expect(result.audioData).toBe(mockAudioBuffer.toString("base64"))
      const callArgs = getMockSpeechCreate().mock.calls[0][0]
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
      getMockSpeechCreate().mockRejectedValue(apiError)

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
      getMockSpeechCreate().mockRejectedValue(apiError)

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
