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
import { checkRateLimit, openAIRateLimiters } from "./rateLimiting"

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

    // Check rate limit before calling OpenAI API
    await checkRateLimit(
      ctx,
      openAIRateLimiters.transcribeAudio,
      authUser.userId
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

    // Check rate limit before calling OpenAI API
    await checkRateLimit(ctx, openAIRateLimiters.textToSpeech, authUser.userId)

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
 * Also recommends a branch name based on the task type (feature/slug or hotfix/slug)
 */
/**
 * Chat with AI to interactively refine a task description
 * Supports multi-turn conversation for task planning
 */
export const planTask = action({
  args: {
    currentTask: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before calling OpenAI API
    await checkRateLimit(ctx, openAIRateLimiters.planTask, authUser.userId)

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
    if (!args.userMessage || args.userMessage.trim().length === 0) {
      throw new Error("Message cannot be empty")
    }

    try {
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })

      // Build the conversation history for the AI
      const systemPrompt = `You are a helpful AI assistant that helps users refine and improve their task descriptions for AI coding agents. Your goal is to:

1. Ask clarifying questions to understand the task better
2. Help the user think through edge cases and requirements
3. Suggest improvements to make the task clearer and more actionable
4. Keep your responses concise and focused

The user's current task description is:
"""
${args.currentTask}
"""

Help them refine this task through conversation. When the task is well-defined, offer to generate a final improved version.
Keep responses short and conversational. Ask one or two questions at a time.`

      // Build messages array with conversation history
      const conversationMessages: Array<{
        role: "user" | "assistant" | "system"
        content: string
      }> = [
        { role: "system", content: systemPrompt },
        ...args.messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: args.userMessage },
      ]

      const { text: response } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        messages: conversationMessages,
      })

      return {
        response: response.trim(),
      }
    } catch (error) {
      console.error("[Convex planTask] Error:", error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error("Invalid OpenAI API key")
        }
        if (error.status === 429) {
          throw new Error("OpenAI rate limit exceeded")
        }
      }
      throw new Error("Failed to process message")
    }
  },
})

/**
 * Generate a final improved task description from a planning conversation
 */
export const generateFinalTask = action({
  args: {
    originalTask: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before calling OpenAI API
    await checkRateLimit(
      ctx,
      openAIRateLimiters.generateFinalTask,
      authUser.userId
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
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })

      // Build a summary of the conversation for context
      const conversationSummary = args.messages
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n")

      const { text: response } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        prompt: `Based on the following conversation where a user refined their task description, generate the final improved task description.

Original task:
"""
${args.originalTask}
"""

Conversation:
${conversationSummary}

Generate a clear, comprehensive, and actionable task description that incorporates all the insights from the conversation. The task should be ready for an AI coding agent to execute.

Also recommend a branch name based on the task type:
- If this is a new feature or enhancement, use format: feature/slug (e.g., feature/add-user-authentication)
- If this is a bug fix, use format: hotfix/slug (e.g., hotfix/fix-login-error)
- Create a short, descriptive slug (lowercase, use hyphens instead of spaces)
- The slug should be 2-4 words that summarize the task

Respond in the following format:
IMPROVED_DESCRIPTION:
[Your improved task description here]

BRANCH_NAME:
[feature/slug or hotfix/slug]`,
      })

      // Parse the response
      const improvedTextMatch = response.match(
        /IMPROVED_DESCRIPTION:\s*([\s\S]+?)(?=\nBRANCH_NAME:|$)/
      )
      const branchNameMatch = response.match(/BRANCH_NAME:\s*(.+?)(?:\n|$)/)

      let improvedText: string
      let branchName: string | undefined

      if (improvedTextMatch) {
        improvedText = improvedTextMatch[1].trim()
        branchName = branchNameMatch
          ? branchNameMatch[1].trim() || undefined
          : undefined
      } else {
        improvedText = response.trim()
        branchName = undefined
      }

      // Validate branch name format
      if (branchName && !/^(feature|hotfix)\//.test(branchName)) {
        branchName = undefined
      }

      return {
        text: improvedText,
        branchName: branchName || undefined,
      }
    } catch (error) {
      console.error("[Convex generateFinalTask] Error:", error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error("Invalid OpenAI API key")
        }
        if (error.status === 429) {
          throw new Error("OpenAI rate limit exceeded")
        }
      }
      throw new Error("Failed to generate final task")
    }
  },
})

export const improvePrompt = action({
  args: {
    text: v.string(),
    messages: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // Check rate limit before calling OpenAI API
    await checkRateLimit(ctx, openAIRateLimiters.improvePrompt, authUser.userId)

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
      // Generate improved prompt and branch name using AI SDK
      const openaiProvider = createOpenAI({ apiKey: openaiApiKey })

      // Build conversation context if messages exist
      const conversationContext =
        args.messages && args.messages.length > 0
          ? `\n\nPrevious conversation:\n${args.messages
              .map(
                (msg) =>
                  `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
              )
              .join("\n")}`
          : ""

      const { text: response } = await generateText({
        model: openaiProvider("gpt-4o-mini"),
        prompt: `You are helping to improve task descriptions for AI coding agents. Your role is similar to Cursor or Claude Code - you need to determine if a task description is ready to go or if you need to ask clarifying questions first.

Original task description:
${args.text}${conversationContext}

Your process:
1. First, analyze the task description to determine if it's clear and actionable enough for an AI coding agent to execute
2. If the task needs clarification (e.g., ambiguous requirements, missing context, unclear scope), you should ask questions instead of generating a summary
3. If the task is clear enough, generate an improved version with better structure and clarity

Decision criteria for asking questions:
- Task is too vague or high-level (e.g., "improve the app", "add features")
- Missing important context (e.g., which files/components to modify, what the expected behavior should be)
- Ambiguous requirements (e.g., "make it better", "fix the bug")
- Unclear scope (e.g., should this include frontend, backend, or both?)
- Missing technical details (e.g., which framework, which database, which API endpoints)

If you need to ask questions, respond with:
QUESTIONS:
[Your clarifying questions here. Be specific and helpful. For example: "Just to clarify, will this task only build the backend or would you also like a user interface for this feature? Also, should this integrate with the existing authentication system or be standalone?"]

If the task is ready, respond with:
IMPROVED_DESCRIPTION:
[Your improved task description here]

BRANCH_NAME:
[feature/slug or hotfix/slug]

For the branch name:
- If this is a new feature or enhancement, use format: feature/slug (e.g., feature/add-user-authentication)
- If this is a bug fix, use format: hotfix/slug (e.g., hotfix/fix-login-error)
- Create a short, descriptive slug (lowercase, use hyphens instead of spaces)
- The slug should be 2-4 words that summarize the task
- If a Jira ticket is provided, use the ticket number in the slug (e.g., feature/BE-2708-tablet-design-improvements)

Respond in ONE of the two formats above.`,
      })

      // Check if response contains questions
      const questionsMatch = response.match(/QUESTIONS:\s*([\s\S]+?)(?=\n(?:IMPROVED_DESCRIPTION|BRANCH_NAME)|$)/)
      
      if (questionsMatch) {
        // Task needs clarification - return questions
        const questions = questionsMatch[1].trim()
        return {
          text: undefined,
          branchName: undefined,
          questions: questions || undefined,
        }
      }

      // Parse the response to extract improved text and branch name
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
        questions: undefined,
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
