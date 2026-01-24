"use node"

import { v } from "convex/values"
import { decryptData } from "encryption"
import { parseGithubPrUrl } from "validators"
import { api, internal } from "./_generated/api"
import { action, internalAction } from "./_generated/server"
import { checkRateLimit, githubRateLimiters } from "./rateLimiting"

/**
 * Get the decrypted GitHub token for a user (internal use only)
 */
export const getGithubToken = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const record = await ctx.runQuery(
      internal.apiKeys.getApiKeysRecordInternal,
      { userId: args.userId }
    )

    if (!record?.encryptedGithubToken || record.encryptedGithubToken === "") {
      return null
    }

    try {
      return decryptData(record.encryptedGithubToken)
    } catch {
      return null
    }
  },
})

interface TokenValidationResult {
  valid: boolean
  username?: string
  avatarUrl?: string
  expiresAt?: string | null
  scopes?: string[]
  error?: string
}

/**
 * Check if the GitHub token is valid and get user info
 * Also retrieves token expiration if available (for fine-grained tokens)
 */
export const checkGithubToken = action({
  args: {},
  handler: async (ctx): Promise<TokenValidationResult> => {
    // Get the token status first to check if one exists
    const record = await ctx.runQuery(api.apiKeys.getApiKeysRecord)

    if (!record?.encryptedGithubToken || record.encryptedGithubToken === "") {
      return { valid: false, error: "No GitHub token configured" }
    }

    let githubToken: string
    try {
      githubToken = decryptData(record.encryptedGithubToken)
    } catch {
      return { valid: false, error: "Failed to decrypt token" }
    }

    // Call GitHub API to verify the token and get user info
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: "Token is invalid or expired" }
      }
      if (response.status === 403) {
        return { valid: false, error: "Token has insufficient permissions" }
      }
      return {
        valid: false,
        error: `GitHub API error: ${response.status}`,
      }
    }

    const userData = await response.json()

    // Extract token metadata from response headers
    // GitHub returns OAuth scopes in the X-OAuth-Scopes header (for classic tokens)
    const scopesHeader = response.headers.get("X-OAuth-Scopes")
    const scopes = scopesHeader
      ? scopesHeader.split(",").map((s) => s.trim())
      : undefined

    // For fine-grained tokens, check expiration via a separate API call
    // The /rate_limit endpoint returns token expiration in headers for fine-grained tokens
    let expiresAt: string | null = null
    try {
      const rateLimitResponse = await fetch(
        "https://api.github.com/rate_limit",
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      )
      // GitHub returns token expiration in the GitHub-Authentication-Token-Expiration header
      const expirationHeader = rateLimitResponse.headers.get(
        "GitHub-Authentication-Token-Expiration"
      )
      if (expirationHeader) {
        expiresAt = expirationHeader
      }
    } catch {
      // Ignore errors checking expiration
    }

    return {
      valid: true,
      username: userData.login,
      avatarUrl: userData.avatar_url,
      expiresAt,
      scopes,
    }
  },
})

/**
 * Merge a pull request using the GitHub API
 */
export const mergePullRequest = action({
  args: {
    prUrl: v.string(),
    mergeMethod: v.optional(
      v.union(v.literal("merge"), v.literal("squash"), v.literal("rebase"))
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string; sha?: string }> => {
    // 1. Get authenticated user
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )
    if (!authUser) {
      throw new Error("Unauthorized")
    }

    // 2. Check rate limit
    await checkRateLimit(ctx, githubRateLimiters.mergePr, authUser.userId)

    // 3. Get and decrypt GitHub token
    const githubToken = await ctx.runAction(internal.github.getGithubToken, {
      userId: authUser.userId,
    })

    if (!githubToken) {
      throw new Error(
        "GitHub token not configured. Please add your GitHub Personal Access Token in Account Settings."
      )
    }

    // 4. Parse PR URL
    const parsed = parseGithubPrUrl(args.prUrl)
    if (!parsed) {
      throw new Error(
        "Invalid pull request URL format. Expected format: https://github.com/owner/repo/pull/123"
      )
    }

    const { owner, repo, prNumber } = parsed
    const mergeMethod = args.mergeMethod ?? "squash"

    // 5. Call GitHub API to merge PR
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          merge_method: mergeMethod,
        }),
      }
    )

    // 6. Handle response
    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        message: data.message || "Pull request merged successfully",
        sha: data.sha,
      }
    }

    // Handle specific error cases
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.message || "Unknown error"

    switch (response.status) {
      case 405:
        throw new Error(
          "Pull request is not mergeable. Check for merge conflicts or required reviews."
        )
      case 404:
        throw new Error(
          "Pull request not found or you don't have permission to access it."
        )
      case 403:
        throw new Error(
          "Insufficient permissions. Your GitHub token may need 'repo' or write access to pull requests."
        )
      case 409:
        throw new Error(
          `Merge conflict: ${errorMessage}. The head branch may have been modified.`
        )
      case 422:
        throw new Error(`Validation failed: ${errorMessage}`)
      default:
        throw new Error(
          `GitHub API error (${response.status}): ${errorMessage}`
        )
    }
  },
})
