"use node"

import { v } from "convex/values"
import { decryptData } from "encryption"
import { parseGithubPrUrl } from "validators"
import { internal } from "./_generated/api"
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
        throw new Error(`GitHub API error (${response.status}): ${errorMessage}`)
    }
  },
})
