"use node"

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { v } from "convex/values"
import { decryptData } from "encryption"
import OpenAI from "openai"
import {
  type AgentConversation,
  extractUserMessagesAndLastAssistant,
} from "validators"
import { api, internal } from "./_generated/api"
import { action } from "./_generated/server"

/**
 * Summarize a conversation using OpenAI
 */
export const summarizeConversation = action({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get OpenAI API key
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    if (!record?.encryptedOpenaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }

    let openaiApiKey: string
    try {
      openaiApiKey = decryptData(record.encryptedOpenaiApiKey)
    } catch {
      throw new Error("Failed to decrypt OpenAI API key")
    }

    // Get conversation (the action handles API key internally)
    const conversationData = await ctx.runAction(api.cursor.getConversation, {
      agentId: args.agentId,
    })

    if (!conversationData.conversation) {
      throw new Error("Conversation not found")
    }

    const conversation: AgentConversation = conversationData.conversation

    // Check if conversation has messages
    if (
      !conversation ||
      !conversation.messages ||
      conversation.messages.length === 0
    ) {
      throw new Error("No conversation messages to summarize")
    }

    // Check if this is a placeholder conversation (simulation mode only)
    if (
      conversationData.simulation &&
      conversation.messages.length === 1 &&
      conversation.messages[0]?.id === "msg_placeholder"
    ) {
      throw new Error("Conversation not found")
    }

    // Extract only user messages and last assistant message from each turn
    const condensedMessages = extractUserMessagesAndLastAssistant(
      conversation.messages
    )

    // Format conversation for summarization
    const conversationText = condensedMessages
      .map((msg) => {
        if (msg.type === "user_message") {
          return `User: ${msg.text || ""}`
        } else if (msg.type === "assistant_message") {
          return `Agent: ${msg.text || ""}`
        }
        return ""
      })
      .filter(Boolean)
      .join("\n\n")

    if (!conversationText.trim()) {
      throw new Error("Conversation has no meaningful content to summarize")
    }

    try {
      // Generate summary using AI SDK with user's API key
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })
      const { text: summary } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        prompt: `Please provide a concise summary of the following conversation between a user and a Cursor AI agent. Focus on:
- The main task or goal
- Key actions taken by the agent
- Important decisions or outcomes
- Any errors or issues encountered

Conversation:
${conversationText}

Summary:`,
      })

      // Save summary to database and clear old audio (audio will be generated on-demand when user clicks "Listen")
      await ctx.runMutation(api.agents.updateSummary, {
        agentId: args.agentId,
        summary,
        audioSummary: undefined, // Clear old audio since summary changed
      })

      return { summary }
    } catch (error) {
      console.error("[Convex summarizeConversation] Error:", error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error("Invalid OpenAI API key")
        }
        if (error.status === 429) {
          throw new Error("OpenAI rate limit exceeded")
        }
      }
      throw new Error("Failed to generate summary")
    }
  },
})

/**
 * Transcribe audio using OpenAI Whisper
 */
export const transcribeAudio = action({
  args: {
    audioData: v.string(), // Base64 encoded audio
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get OpenAI API key
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    if (!record?.encryptedOpenaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }

    let openaiApiKey: string
    try {
      openaiApiKey = decryptData(record.encryptedOpenaiApiKey)
    } catch {
      throw new Error("Failed to decrypt OpenAI API key")
    }

    try {
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(args.audioData, "base64")

      // Map MIME type to a file extension that OpenAI Whisper accepts.
      // The API relies on the file extension to detect format.
      const getExtensionFromMimeType = (mimeType: string): string => {
        switch (mimeType) {
          case "audio/webm":
            return "webm"
          case "audio/mp4":
            return "mp4"
          case "audio/mpeg":
          case "audio/mp3":
            return "mp3"
          case "audio/wav":
          case "audio/x-wav":
            return "wav"
          case "audio/ogg":
            return "ogg"
          case "audio/flac":
            return "flac"
          default:
            // Fallback to mp3, which is broadly supported
            return "mp3"
        }
      }

      const extension = getExtensionFromMimeType(args.mimeType)

      // Create a File-like object for OpenAI API
      const audioFile = new File([audioBuffer], `audio.${extension}`, {
        type: args.mimeType,
      })

      // Call OpenAI Whisper API
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      })

      return { text: transcription.text }
    } catch (error) {
      console.error("[Convex transcribeAudio] Error:", error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error("Invalid OpenAI API key")
        }
        if (error.status === 429) {
          throw new Error("OpenAI rate limit exceeded")
        }
      }
      throw new Error("Failed to transcribe audio")
    }
  },
})

/**
 * Generate text-to-speech audio using OpenAI TTS
 */
export const textToSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get OpenAI API key
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    if (!record?.encryptedOpenaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }

    let openaiApiKey: string
    try {
      openaiApiKey = decryptData(record.encryptedOpenaiApiKey)
    } catch {
      throw new Error("Failed to decrypt OpenAI API key")
    }

    try {
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: (args.voice || "alloy") as
          | "alloy"
          | "echo"
          | "fable"
          | "onyx"
          | "nova"
          | "shimmer",
        input: args.text,
      })

      // Convert to base64 for transport
      const buffer = Buffer.from(await mp3.arrayBuffer())
      const base64 = buffer.toString("base64")

      return { audioData: base64, mimeType: "audio/mpeg" }
    } catch (error) {
      console.error("[Convex textToSpeech] Error:", error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error("Invalid OpenAI API key")
        }
        if (error.status === 429) {
          throw new Error("OpenAI rate limit exceeded")
        }
      }
      throw new Error("Failed to generate speech")
    }
  },
})

/**
 * Improve a task description/prompt to make it clearer and more effective for an AI agent
 */
export const improvePrompt = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Get OpenAI API key
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: authUser.userId,
      }
    )

    if (!record?.encryptedOpenaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }

    let openaiApiKey: string
    try {
      openaiApiKey = decryptData(record.encryptedOpenaiApiKey)
    } catch {
      throw new Error("Failed to decrypt OpenAI API key")
    }

    // Validate input
    if (!args.text || args.text.trim().length === 0) {
      throw new Error("Text cannot be empty")
    }

    try {
      // Generate improved prompt using AI SDK
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })
      const { text: improvedText } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        prompt: `You are helping to improve task descriptions for AI coding agents. The user has provided a task description that they want to make clearer and more effective.

Your goal is to:
1. Make the task description more specific and actionable
2. Clarify any ambiguous requirements
3. Add context that would help an AI agent understand the goal better
4. Maintain the original intent and tone
5. Keep it concise but comprehensive

Original task description:
${args.text}

Improved task description:`,
      })

      return { text: improvedText.trim() }
    } catch (error) {
      console.error("[Convex improvePrompt] Error:", error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error("Invalid OpenAI API key")
        }
        if (error.status === 429) {
          throw new Error("OpenAI rate limit exceeded")
        }
      }
      throw new Error("Failed to improve prompt")
    }
  },
})
