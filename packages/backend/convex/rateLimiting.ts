"use node"

import { RateLimiter } from "@convex-dev/rate-limiter"
import { components, internal } from "./_generated/api"
import { ActionCtx } from "./_generated/server"

/**
 * Rate limiting configuration for Cursor API endpoints
 * 
 * Limits are set conservatively to prevent abuse while allowing reasonable usage:
 * - Launch agent: 10 RPM (expensive operation, creates new agents)
 * - Get agents: 30 RPM (listing operations, less expensive)
 * - Get agent by ID: 30 RPM (single agent fetch)
 * - Get conversation: 60 RPM (reading conversation data)
 * - Send follow-up: 20 RPM (modifying agent state)
 * - Stop agent: 20 RPM (modifying agent state)
 * - Delete agent: 10 RPM (destructive operation)
 * - Get models: 30 RPM (cached, but still needs rate limiting)
 */
export const cursorRateLimiters = {
  launchAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:launch",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
  },
  getAgents: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-agents",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
  getAgentById: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-agent",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
  getConversation: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-conversation",
      requestsPerMinute: 60,
    }),
    requestsPerMinute: 60,
  },
  getConversationWithCursor: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-conversation-cursor",
      requestsPerMinute: 60,
    }),
    requestsPerMinute: 60,
  },
  sendFollowUp: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:followup",
      requestsPerMinute: 20,
    }),
    requestsPerMinute: 20,
  },
  stopAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:stop",
      requestsPerMinute: 20,
    }),
    requestsPerMinute: 20,
  },
  deleteAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:delete",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
  },
  getModels: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-models",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
}

/**
 * Rate limiting configuration for OpenAI API endpoints
 * 
 * Limits are set conservatively to prevent abuse while allowing reasonable usage:
 * - Summarize conversation: 15 RPM (expensive GPT-4 operation)
 * - Transcribe audio: 30 RPM (Whisper API, moderate cost)
 * - Text to speech: 30 RPM (TTS API, moderate cost)
 * - Improve prompt: 30 RPM (GPT-4 operation, but shorter prompts)
 */
export const openAIRateLimiters = {
  summarizeConversation: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:summarize",
      requestsPerMinute: 15,
    }),
    requestsPerMinute: 15,
  },
  transcribeAudio: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:transcribe",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
  textToSpeech: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:tts",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
  improvePrompt: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:improve-prompt",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
}

/**
 * Helper function to check rate limit and throw if exceeded
 * @param ctx - Action context
 * @param rateLimiterConfig - Rate limiter configuration object with limiter and requestsPerMinute
 * @param userId - User ID for per-user rate limiting
 * @throws Error if rate limit is exceeded
 */
export async function checkRateLimit(
  ctx: ActionCtx,
  rateLimiterConfig: { limiter: RateLimiter; requestsPerMinute: number },
  userId: string
): Promise<void> {
  const key = `${userId}`
  const result = await rateLimiterConfig.limiter.check(ctx, key)

  if (!result.allowed) {
    const resetTime = new Date(result.resetTime).toISOString()
    throw new Error(
      `Rate limit exceeded. Limit: ${rateLimiterConfig.requestsPerMinute} requests per minute. ` +
        `Try again after ${resetTime}`
    )
  }
}
