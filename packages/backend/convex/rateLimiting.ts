"use node"

import { RateLimiter } from "@convex-dev/rate-limiter"
import { components, internal } from "./_generated/api"
import { ActionCtx } from "./_generated/server"

/**
 * Rate limiting configuration for Cursor API endpoints
 * 
 * Limits are based on realistic power user usage patterns:
 * - Launch agent: 5 RPM (power users might launch 2-3 agents quickly, but not 10+)
 * - Get agents: 20 RPM (refreshing agent list, reasonable for active monitoring)
 * - Get agent by ID: 20 RPM (viewing individual agent details)
 * - Get conversation: 30 RPM (refreshing conversation view, auto-refresh scenarios)
 * - Send follow-up: 10 RPM (sending follow-up messages to agents)
 * - Stop agent: 5 RPM (stopping running agents)
 * - Delete agent: 3 RPM (destructive operation, should be rare)
 * - Get models: 10 RPM (checking available models, usually cached)
 */
export const cursorRateLimiters = {
  launchAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:launch",
      requestsPerMinute: 5,
    }),
    requestsPerMinute: 5,
  },
  getAgents: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-agents",
      requestsPerMinute: 20,
    }),
    requestsPerMinute: 20,
  },
  getAgentById: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-agent",
      requestsPerMinute: 20,
    }),
    requestsPerMinute: 20,
  },
  getConversation: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-conversation",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
  getConversationWithCursor: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-conversation-cursor",
      requestsPerMinute: 30,
    }),
    requestsPerMinute: 30,
  },
  sendFollowUp: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:followup",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
  },
  stopAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:stop",
      requestsPerMinute: 5,
    }),
    requestsPerMinute: 5,
  },
  deleteAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:delete",
      requestsPerMinute: 3,
    }),
    requestsPerMinute: 3,
  },
  getModels: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:get-models",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
  },
}

/**
 * Rate limiting configuration for OpenAI API endpoints
 * 
 * Limits are based on realistic power user usage patterns:
 * - Summarize conversation: 3 RPM (users typically generate 1-2 summaries per conversation, maybe 3-5 per hour)
 * - Transcribe audio: 10 RPM (users might transcribe a few audio clips, but not 30 per minute)
 * - Text to speech: 10 RPM (similar to transcribe, generating audio for summaries)
 * - Improve prompt: 10 RPM (users might improve prompts a few times, but not constantly)
 */
export const openAIRateLimiters = {
  summarizeConversation: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:summarize",
      requestsPerMinute: 3,
    }),
    requestsPerMinute: 3,
  },
  transcribeAudio: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:transcribe",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
  },
  textToSpeech: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:tts",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
  },
  improvePrompt: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "openai:improve-prompt",
      requestsPerMinute: 10,
    }),
    requestsPerMinute: 10,
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
