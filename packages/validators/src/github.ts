import { z } from "zod"

/**
 * Schema for parsed GitHub PR URL data
 */
export const githubPrDataSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive(),
})

export type GithubPrData = z.infer<typeof githubPrDataSchema>

/**
 * Regex pattern for GitHub PR URLs
 * Matches formats like:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/files
 * - http://github.com/owner/repo/pull/123
 * - github.com/owner/repo/pull/123
 * - www.github.com/owner/repo/pull/123
 */
const GITHUB_PR_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/

/**
 * Parse a GitHub PR URL string into its components
 * Returns null if the URL doesn't match the expected pattern
 */
function parseUrl(url: string): GithubPrData | null {
  const match = url.match(GITHUB_PR_URL_PATTERN)
  if (!match) return null
  const owner = match[1]
  const repo = match[2]
  const prNum = match[3]
  if (owner === undefined || repo === undefined || prNum === undefined)
    return null
  return {
    owner,
    repo,
    prNumber: parseInt(prNum, 10),
  }
}

/**
 * Schema for GitHub PR URL validation and parsing
 * Transforms a valid PR URL string into parsed owner/repo/prNumber
 */
export const githubPrUrlSchema = z
  .string()
  .min(1, "Pull request URL is required")
  .refine((url) => parseUrl(url) !== null, {
    message:
      "Invalid pull request URL format. Expected format: https://github.com/owner/repo/pull/123",
  })
  .transform((url) => parseUrl(url)!)

/**
 * Parse a GitHub PR URL and return the owner, repo, and PR number
 * Returns null if the URL is invalid
 */
export function parseGithubPrUrl(prUrl: string): GithubPrData | null {
  const result = githubPrUrlSchema.safeParse(prUrl)
  return result.success ? result.data : null
}

/**
 * Validate a GitHub PR URL and throw if invalid
 * Returns parsed data if valid
 */
export function validateGithubPrUrl(prUrl: string): GithubPrData {
  return githubPrUrlSchema.parse(prUrl)
}

/**
 * Schema for GitHub merge method
 */
export const githubMergeMethodSchema = z.enum(["merge", "squash", "rebase"])

export type GithubMergeMethod = z.infer<typeof githubMergeMethodSchema>

/**
 * Schema for merge PR request
 */
export const mergePrRequestSchema = z.object({
  prUrl: z.string().min(1, "Pull request URL is required"),
  mergeMethod: githubMergeMethodSchema.optional().default("squash"),
})

export type MergePrRequest = z.infer<typeof mergePrRequestSchema>
