"use node"

import { v } from "convex/values"
import crypto from "crypto"
import { internal } from "./_generated/api"
import { action } from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

// Derive encryption key from environment secret
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_SECRET must be at least 32 characters")
  }
  return crypto.scryptSync(secret, "salt", KEY_LENGTH)
}

function encryptData(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Combine iv + authTag + encrypted
  return iv.toString("hex") + authTag.toString("hex") + encrypted
}

function decryptData(encryptedData: string): string {
  const key = getEncryptionKey()

  // Extract iv, authTag, and encrypted data
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), "hex")
  const authTag = Buffer.from(
    encryptedData.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2),
    "hex"
  )
  const encrypted = encryptedData.slice(IV_LENGTH * 2 + TAG_LENGTH * 2)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// Mask an API key for display (show first 4 and last 4 chars)
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****"
  }
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}

// ============================================================================
// Public actions (handle encryption/decryption)
// ============================================================================

/**
 * Check if user has a Cursor API key configured
 * Returns masked version if exists, null if not
 */
export const getCursorApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await getAuthenticatedUser(ctx)

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedCursorApiKey) {
      return { hasKey: false, maskedKey: null }
    }

    try {
      const decrypted = decryptData(record.encryptedCursorApiKey)
      return { hasKey: true, maskedKey: maskApiKey(decrypted) }
    } catch {
      return { hasKey: false, maskedKey: null }
    }
  },
})

/**
 * Get the decrypted Cursor API key (for server-side use)
 */
export const getDecryptedCursorApiKey = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const authUser = await getAuthenticatedUser(ctx)

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedCursorApiKey) {
      return null
    }

    try {
      return decryptData(record.encryptedCursorApiKey)
    } catch {
      return null
    }
  },
})

/**
 * Save/update Cursor API key (encrypts before storing)
 */
export const saveCursorApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUser = await getAuthenticatedUser(ctx)

    const encrypted = encryptData(args.apiKey)

    await ctx.runMutation(internal.apiKeys.upsertApiKeys, {
      userId: authUser.userId,
      encryptedCursorApiKey: encrypted,
    })

    return { success: true }
  },
})

/**
 * Delete Cursor API key
 */
export const deleteCursorApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const authUser = await getAuthenticatedUser(ctx)

    await ctx.runMutation(internal.apiKeys.clearCursorApiKey, {
      userId: authUser.userId,
    })

    return { success: true }
  },
})

/**
 * Check if user has an OpenAI API key configured
 * Returns masked version if exists, null if not
 */
export const getOpenaiApiKeyStatus = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ hasKey: boolean; maskedKey: string | null }> => {
    const authUser = await getAuthenticatedUser(ctx)

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedOpenaiApiKey) {
      return { hasKey: false, maskedKey: null }
    }

    try {
      const decrypted = decryptData(record.encryptedOpenaiApiKey)
      return { hasKey: true, maskedKey: maskApiKey(decrypted) }
    } catch {
      return { hasKey: false, maskedKey: null }
    }
  },
})

/**
 * Get the decrypted OpenAI API key (for server-side use)
 */
export const getDecryptedOpenaiApiKey = action({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const authUser = await getAuthenticatedUser(ctx)

    const record = await ctx.runQuery(internal.apiKeys.getApiKeysRecord, {
      userId: authUser.userId,
    })

    if (!record?.encryptedOpenaiApiKey) {
      return null
    }

    try {
      return decryptData(record.encryptedOpenaiApiKey)
    } catch {
      return null
    }
  },
})

/**
 * Save/update OpenAI API key (encrypts before storing)
 */
export const saveOpenaiApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const authUser = await getAuthenticatedUser(ctx)

    const encrypted = encryptData(args.apiKey)

    await ctx.runMutation(internal.apiKeys.upsertApiKeys, {
      userId: authUser.userId,
      encryptedOpenaiApiKey: encrypted,
    })

    return { success: true }
  },
})

/**
 * Delete OpenAI API key
 */
export const deleteOpenaiApiKey = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const authUser = await getAuthenticatedUser(ctx)

    await ctx.runMutation(internal.apiKeys.clearOpenaiApiKey, {
      userId: authUser.userId,
    })

    return { success: true }
  },
})

/**
 * Delete all API keys for user
 */
export const deleteAllApiKeys = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const authUser = await getAuthenticatedUser(ctx)

    await ctx.runMutation(internal.apiKeys.deleteApiKeysRecord, {
      userId: authUser.userId,
    })

    return { success: true }
  },
})
