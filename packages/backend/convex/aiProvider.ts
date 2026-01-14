"use node"

import { createOpenAI } from "@ai-sdk/openai"
import OpenAI from "openai"
import { decryptData } from "encryption"
import { internal } from "./_generated/api"

export type AIProvider = "openai" | "verso"

export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
}

/**
 * Get the configured AI provider and API key for the authenticated user
 */
export async function getAIProviderConfig(
  ctx: any,
  authUser: { userId: string }
): Promise<AIProviderConfig> {
  // Get API keys record
  const record = await ctx.runQuery(
    internal.apiKeys.getApiKeysRecordInternal,
    {
      userId: authUser.userId,
    }
  )

  if (!record) {
    throw new Error("API keys record not found")
  }

  // Get preferred provider (defaults to openai)
  const provider = record.aiProvider ?? "openai"

  let apiKey: string

  if (provider === "openai") {
    if (!record.encryptedOpenaiApiKey) {
      throw new Error("OpenAI API key not configured")
    }
    try {
      apiKey = decryptData(record.encryptedOpenaiApiKey)
    } catch {
      throw new Error("Failed to decrypt OpenAI API key")
    }
  } else {
    // Verso provider
    if (!record.encryptedVersoApiKey) {
      throw new Error("Verso API key not configured")
    }
    try {
      apiKey = decryptData(record.encryptedVersoApiKey)
    } catch {
      throw new Error("Failed to decrypt Verso API key")
    }
  }

  return { provider, apiKey }
}

/**
 * Create an AI provider instance based on the provider type
 */
export function createAIProvider(config: AIProviderConfig) {
  if (config.provider === "openai") {
    return createOpenAI({ apiKey: config.apiKey })
  } else {
    // Verso API - using OpenAI-compatible endpoint
    // Verso typically provides OpenAI-compatible API
    // Adjust the baseURL if Verso uses a different endpoint
    return createOpenAI({
      apiKey: config.apiKey,
      baseURL: process.env.VERSO_API_BASE_URL || "https://api.verso.ai/v1",
    })
  }
}

/**
 * Create an OpenAI client instance (for audio APIs)
 */
export function createOpenAIClient(config: AIProviderConfig): OpenAI {
  if (config.provider === "openai") {
    return new OpenAI({ apiKey: config.apiKey })
  } else {
    // Verso API - using OpenAI-compatible endpoint
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: process.env.VERSO_API_BASE_URL || "https://api.verso.ai/v1",
    })
  }
}

/**
 * Handle API errors from either provider
 */
export function handleAIError(error: unknown, provider: AIProvider): never {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      throw new Error(
        `Invalid ${provider === "openai" ? "OpenAI" : "Verso"} API key`
      )
    }
    if (error.status === 429) {
      throw new Error(
        `${provider === "openai" ? "OpenAI" : "Verso"} rate limit exceeded`
      )
    }
  }
  throw error
}
