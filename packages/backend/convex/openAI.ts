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
import { action, internalAction } from "./_generated/server"
import { checkRateLimit, openAIRateLimiters } from "./rateLimiting"

/**
 * Internal action to get and decrypt OpenAI API key for a user
 * Throws an error if no API key is configured or decryption fails
 */
export const getUserOpenAIKey = internalAction({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      {
        userId: args.userId,
      }
    )

    if (!record?.encryptedOpenaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }

    try {
      return decryptData(record.encryptedOpenaiApiKey) as string
    } catch {
      throw new Error("Failed to decrypt OpenAI API key")
    }
  },
})

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

    // Check rate limit before calling OpenAI API
    await checkRateLimit(
      ctx,
      openAIRateLimiters.summarizeConversation,
      authUser.userId
    )

    // Get OpenAI API key
    const openaiApiKey: string = await ctx.runAction(
      internal.openAI.getUserOpenAIKey,
      {
        userId: authUser.userId,
      }
    )

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
 * Summarize today's work session using OpenAI
 * Analyzes all time logs from today (Australia/Brisbane timezone) and generates a summary
 */
export const summarizeTodayWork = action({
  args: {},
  handler: async (ctx): Promise<{ summary: string }> => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before calling OpenAI API
    await checkRateLimit(
      ctx,
      openAIRateLimiters.summarizeTodayWork,
      authUser.userId
    )

    // Get OpenAI API key
    const openaiApiKey: string = await ctx.runAction(
      internal.openAI.getUserOpenAIKey,
      {
        userId: authUser.userId,
      }
    )

    // Get today's time logs (already filtered by Brisbane timezone)
    const todayTimeLogs = await ctx.runQuery(api.timeLogs.getTodayTimeLogs)

    if (!todayTimeLogs || todayTimeLogs.length === 0) {
      throw new Error("No time logs found for today")
    }

    // Get all tasks to map task IDs to task information
    const tasks = await ctx.runQuery(api.tasks.getTasks)
    type Task = (typeof tasks)[number]

    const taskMap = new Map(
      tasks.map((task: Task) => [task._id, task] as const)
    ) as Map<string, Task>

    // Format time logs with task information
    const workSessions = todayTimeLogs.map(
      (log: (typeof todayTimeLogs)[number]) => {
        const task = taskMap.get(log.taskId)
        const duration = log.endTime - log.startTime
        const durationMinutes = Math.round(duration / 60000)
        const startDate = new Date(log.startTime)
        const endDate = new Date(log.endTime)

        return {
          task: task?.title ?? "Unknown Task",
          description: task?.description,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          duration: `${durationMinutes} minutes`,
          activityType: log.activityType,
        }
      }
    )

    // Calculate total time
    const totalMinutes = todayTimeLogs.reduce(
      (sum: number, log: (typeof todayTimeLogs)[number]) =>
        sum + Math.round((log.endTime - log.startTime) / 60000),
      0
    )
    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    // Format work sessions for AI
    const workSessionsText = workSessions
      .map((session: (typeof workSessions)[number], index: number) => {
        const lines = [
          `Session ${index + 1}:`,
          `- Task: ${session.task}`,
          session.description ? `- Description: ${session.description}` : null,
          `- Start: ${session.startTime}`,
          `- End: ${session.endTime}`,
          `- Duration: ${session.duration}`,
          session.activityType
            ? `- Activity Type: ${session.activityType}`
            : null,
        ]
        return lines.filter(Boolean).join("\n")
      })
      .join("\n\n")

    try {
      // Generate summary using AI SDK with user's API key
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })
      const { text: summary } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        prompt: `Please provide a concise summary of today's work sessions. Focus on:
- Overall productivity and accomplishments
- Main tasks worked on
- Time distribution across different tasks
- Any patterns or insights about the work day

Total time worked today: ${totalHours} hours and ${remainingMinutes} minutes

Work Sessions:
${workSessionsText}

Summary:`,
      })

      return { summary }
    } catch (error) {
      console.error("[Convex summarizeTodayWork] Error:", error)
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

    // Check rate limit before calling OpenAI API
    await checkRateLimit(
      ctx,
      openAIRateLimiters.transcribeAudio,
      authUser.userId
    )

    // Get OpenAI API key
    const openaiApiKey: string = await ctx.runAction(
      internal.openAI.getUserOpenAIKey,
      {
        userId: authUser.userId,
      }
    )

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

    // Check rate limit before calling OpenAI API
    await checkRateLimit(ctx, openAIRateLimiters.textToSpeech, authUser.userId)

    // Get OpenAI API key
    const openaiApiKey: string = await ctx.runAction(
      internal.openAI.getUserOpenAIKey,
      {
        userId: authUser.userId,
      }
    )

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
 * Also recommends a branch name based on the task type (feature/slug or hotfix/slug)
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
    const openaiApiKey: string = await ctx.runAction(
      internal.openAI.getUserOpenAIKey,
      {
        userId: authUser.userId,
      }
    )

    // Validate input
    if (!args.text || args.text.trim().length === 0) {
      throw new Error("Text cannot be empty")
    }

    try {
      // Generate improved prompt and branch name using AI SDK
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })
      const { text: response } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        prompt: `You are helping to improve task descriptions for AI coding agents. The user has provided a task description that they want to make clearer and more effective.

Your goal is to:
1. Make the task description more specific and actionable
2. Clarify any ambiguous requirements
3. Add context that would help an AI agent understand the goal better
4. Maintain the original intent and tone
5. Keep it concise but comprehensive
6. Recommend a branch name based on the task type

For the branch name:
- If this is a new feature or enhancement, use format: feature/slug (e.g., feature/add-user-authentication)
- If this is a bug fix, use format: hotfix/slug (e.g., hotfix/fix-login-error)
- Create a short, descriptive slug (lowercase, use hyphens instead of spaces)
- The slug should be 2-4 words that summarize the task

Original task description:
${args.text}

Respond in the following format:
IMPROVED_DESCRIPTION:
[Your improved task description here]

BRANCH_NAME:
[feature/slug or hotfix/slug]`,
      })

      // Parse the response to extract improved text and branch name
      // Try to match the structured format first
      const improvedTextMatch = response.match(
        /IMPROVED_DESCRIPTION:\s*([\s\S]+?)(?=\nBRANCH_NAME:|$)/
      )
      const branchNameMatch = response.match(/BRANCH_NAME:\s*(.+?)(?:\n|$)/)

      let improvedText: string
      let branchName: string | undefined

      if (improvedTextMatch) {
        // Structured format found
        improvedText = improvedTextMatch[1].trim()
        branchName = branchNameMatch
          ? branchNameMatch[1].trim() || undefined
          : undefined
      } else {
        // Fallback: use entire response as improved text
        improvedText = response.trim()
        branchName = undefined
      }

      // Validate branch name format (should start with feature/ or hotfix/)
      if (branchName && !/^(feature|hotfix)\//.test(branchName)) {
        branchName = undefined
      }

      return {
        text: improvedText,
        branchName: branchName || undefined,
      }
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
