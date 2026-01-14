"use node"

import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { components } from "./_generated/api"
import type { ActionCtx } from "./_generated/server"

// Type assertion needed until Convex regenerates types after component registration
const rateLimiterComponent = (components as any).rateLimiter

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
const cursorRateLimiter = new RateLimiter(rateLimiterComponent, {
  "cursor:launch": {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 3,
  },
  "cursor:get-agents": {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 10,
  },
  "cursor:get-agent": {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 10,
  },
  "cursor:get-conversation": {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 15,
  },
  "cursor:get-conversation-cursor": {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 15,
  },
  "cursor:followup": {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 5,
  },
  "cursor:stop": { kind: "token bucket", rate: 5, period: MINUTE, capacity: 3 },
  "cursor:delete": {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 2,
  },
  "cursor:get-models": {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },
})

export const cursorRateLimiters = {
  launchAgent: {
    limiter: cursorRateLimiter,
    name: "cursor:launch" as const,
    requestsPerMinute: 5,
  },
  getAgents: {
    limiter: cursorRateLimiter,
    name: "cursor:get-agents" as const,
    requestsPerMinute: 20,
  },
  getAgentById: {
    limiter: cursorRateLimiter,
    name: "cursor:get-agent" as const,
    requestsPerMinute: 20,
  },
  getConversation: {
    limiter: cursorRateLimiter,
    name: "cursor:get-conversation" as const,
    requestsPerMinute: 30,
  },
  getConversationWithCursor: {
    limiter: cursorRateLimiter,
    name: "cursor:get-conversation-cursor" as const,
    requestsPerMinute: 30,
  },
  sendFollowUp: {
    limiter: cursorRateLimiter,
    name: "cursor:followup" as const,
    requestsPerMinute: 10,
  },
  stopAgent: {
    limiter: cursorRateLimiter,
    name: "cursor:stop" as const,
    requestsPerMinute: 5,
  },
  deleteAgent: {
    limiter: cursorRateLimiter,
    name: "cursor:delete" as const,
    requestsPerMinute: 3,
  },
  getModels: {
    limiter: cursorRateLimiter,
    name: "cursor:get-models" as const,
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
 * - Plan task: 20 RPM (interactive conversation for task planning, users may send multiple messages)
 * - Generate final task: 5 RPM (generating final task from planning conversation)
 */
const openAIRateLimiter = new RateLimiter(rateLimiterComponent, {
  "openai:summarize": {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 2,
  },
  "openai:transcribe": {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 3,
  },
  "openai:tts": { kind: "token bucket", rate: 10, period: MINUTE, capacity: 5 },
  "openai:improve-prompt": {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 3,
  },
  "openai:plan-task": {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 10,
  },
  "openai:generate-final-task": {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 3,
  },
})

export const openAIRateLimiters = {
  summarizeConversation: {
    limiter: openAIRateLimiter,
    name: "openai:summarize" as const,
    requestsPerMinute: 3,
  },
  transcribeAudio: {
    limiter: openAIRateLimiter,
    name: "openai:transcribe" as const,
    requestsPerMinute: 10,
  },
  textToSpeech: {
    limiter: openAIRateLimiter,
    name: "openai:tts" as const,
    requestsPerMinute: 10,
  },
  improvePrompt: {
    limiter: openAIRateLimiter,
    name: "openai:improve-prompt" as const,
    requestsPerMinute: 10,
  },
  planTask: {
    limiter: openAIRateLimiter,
    name: "openai:plan-task" as const,
    requestsPerMinute: 20,
  },
  generateFinalTask: {
    limiter: openAIRateLimiter,
    name: "openai:generate-final-task" as const,
    requestsPerMinute: 5,
  },
}

/**
 * Helper function to check rate limit and throw if exceeded
 * @param ctx - Action context
 * @param rateLimiterConfig - Rate limiter configuration object with limiter, name, and requestsPerMinute
 * @param userId - User ID for per-user rate limiting
 * @throws Error if rate limit is exceeded
 */
export async function checkRateLimit(
  ctx: ActionCtx,
  rateLimiterConfig: {
    limiter: RateLimiter
    name: string
    requestsPerMinute: number
  },
  userId: string
): Promise<void> {
  // TypeScript incorrectly infers the overload requiring 'config' when using a string name.
  // When using a named limit from the constructor, only { key? } is needed.
  // Casting to any to bypass incorrect type inference.
  const result = (await (rateLimiterConfig.limiter as any).limit(
    ctx,
    rateLimiterConfig.name,
    { key: userId }
  )) as { ok: boolean; retryAfter?: number }

  console.log("result", result)

  if (!result.ok) {
    const retryAfter = result.retryAfter
      ? new Date(Date.now() + result.retryAfter).toISOString()
      : "later"
    throw new Error(
      `Rate limit exceeded. Limit: ${rateLimiterConfig.requestsPerMinute} requests per minute. ` +
        `Try again after ${retryAfter}`
    )
  }
}
