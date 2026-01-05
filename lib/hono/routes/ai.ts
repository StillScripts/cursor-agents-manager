import { createOpenAI } from "@ai-sdk/openai"
import { zValidator } from "@hono/zod-validator"
import { generateText } from "ai"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import OpenAI from "openai"
import { extractUserMessagesAndLastAssistant } from "@/lib/conversation-utils"
import { db } from "@/lib/db"
import { decryptData } from "@/lib/db/encryption"
import { userApiKeys } from "@/lib/db/schema/auth-schema"
import { type AuthVariables, requireAuth } from "@/lib/hono/middleware/auth"
import {
  type OpenAIVariables,
  requireOpenAIKey,
} from "@/lib/hono/middleware/openai"
import { speakSchema, summarizeSchema } from "@/lib/schemas/ai"
import { fetchAgentConversationData } from "@/lib/server/agents"
import type { AgentConversation } from "@/lib/types"

type Variables = AuthVariables & OpenAIVariables

const app = new Hono<{ Variables: Variables }>()

// CRITICAL ORDER: requireAuth MUST run before requireOpenAIKey
app.use("*", requireAuth)
app.use("*", requireOpenAIKey)

// ============================================================================
// POST /api/ai/summarize - Generate conversation summary
// ============================================================================
app.post("/summarize", zValidator("json", summarizeSchema), async (c) => {
  const { agentId } = c.req.valid("json")
  const openaiApiKey = c.get("openaiApiKey")
  const user = c.get("user")

  // Get Cursor API key to fetch conversation data
  const [apiKeyRecord] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, user.id))
    .limit(1)

  let cursorApiKey: string | null = null
  if (apiKeyRecord?.encryptedCursorApiKey) {
    try {
      cursorApiKey = decryptData(apiKeyRecord.encryptedCursorApiKey)
    } catch {
      // If decryption fails, treat as simulation mode
      cursorApiKey = null
    }
  }

  // Get conversation using shared function
  const conversationData = await fetchAgentConversationData(
    agentId,
    cursorApiKey
  )
  if (!conversationData) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  const conversation: AgentConversation = {
    id: conversationData.id,
    messages: conversationData.messages,
  }

  // Check if conversation has messages
  if (
    !conversation ||
    !conversation.messages ||
    conversation.messages.length === 0
  ) {
    return c.json({ error: "No conversation messages to summarize" }, 400)
  }

  // Check if this is a placeholder conversation (simulation mode only)
  if (
    conversationData.simulation &&
    conversation.messages.length === 1 &&
    conversation.messages[0]?.id === "msg_placeholder"
  ) {
    return c.json({ error: "Conversation not found" }, 404)
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
    return c.json(
      { error: "Conversation has no meaningful content to summarize" },
      400
    )
  }

  try {
    // Generate summary using AI SDK with user's API key
    const openaiProvider = createOpenAI({ apiKey: openaiApiKey })
    const { text } = await generateText({
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

    return c.json({ summary: text })
  } catch (error) {
    console.error("Error generating summary:", error)
    return c.json({ error: "Failed to generate summary" }, 500)
  }
})

// ============================================================================
// POST /api/ai/transcribe - Voice-to-text using Whisper
// ============================================================================
app.post("/transcribe", async (c) => {
  const openaiApiKey = c.get("openaiApiKey")

  // Check content-length BEFORE parsing to avoid memory spike
  const contentLength = c.req.header("content-length")
  if (contentLength && parseInt(contentLength, 10) > 25 * 1024 * 1024) {
    return c.json({ error: "File too large (max 25MB)" }, 413)
  }

  // Validate content-type
  const contentType = c.req.header("content-type")
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return c.json({ error: "Content-Type must be multipart/form-data" }, 400)
  }

  // Parse multipart form data
  const body = await c.req.parseBody()
  const audioFile = body.audio

  // Validate file exists and is a File
  if (!audioFile || typeof audioFile === "string") {
    return c.json({ error: "Audio file is required" }, 400)
  }

  if (!(audioFile instanceof File)) {
    return c.json({ error: "Invalid audio file" }, 400)
  }

  // Validate file size
  if (audioFile.size > 25 * 1024 * 1024) {
    return c.json({ error: "Audio file too large (max 25MB)" }, 413)
  }

  // Validate MIME type
  const validTypes = [
    "audio/mp3",
    "audio/mp4",
    "audio/mpeg",
    "audio/mpga",
    "audio/m4a",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
  ]
  if (!validTypes.includes(audioFile.type)) {
    return c.json(
      {
        error:
          "Invalid audio format. Supported: mp3, mp4, mpeg, m4a, wav, webm",
      },
      400
    )
  }

  // Call OpenAI Whisper API
  const openai = new OpenAI({ apiKey: openaiApiKey })

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    })

    return c.json({ text: transcription.text })
  } catch (error) {
    console.error("OpenAI Whisper API error:", error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return c.json(
          {
            error: "Invalid OpenAI API key. Please update in Account settings.",
          },
          401
        )
      }
      if (error.status === 429) {
        return c.json(
          {
            error: "OpenAI rate limit exceeded. Please try again later.",
          },
          429
        )
      }
    }

    return c.json(
      {
        error: "Failed to transcribe audio. Please try again.",
      },
      500
    )
  }
})

// ============================================================================
// POST /api/ai/speak - Text-to-speech using OpenAI TTS
// ============================================================================
app.post("/speak", zValidator("json", speakSchema), async (c) => {
  const { text, voice } = c.req.valid("json")
  const openaiApiKey = c.get("openaiApiKey")

  const openai = new OpenAI({ apiKey: openaiApiKey })

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // or "tts-1-hd" for higher quality
      voice: voice || "alloy",
      input: text,
    })

    // Convert to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Return as audio stream
    return c.body(buffer, 200, {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="speech.mp3"',
      "Content-Length": buffer.length.toString(),
    })
  } catch (error) {
    console.error("OpenAI TTS API error:", error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return c.json(
          {
            error: "Invalid OpenAI API key. Please update in Account settings.",
          },
          401
        )
      }
      if (error.status === 429) {
        return c.json(
          {
            error: "OpenAI rate limit exceeded. Please try again later.",
          },
          429
        )
      }
    }

    return c.json(
      {
        error: "Failed to generate speech. Please try again.",
      },
      500
    )
  }
})

export { app as aiApp }
