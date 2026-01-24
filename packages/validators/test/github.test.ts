import {
  type GithubMergeMethod,
  type GithubPrData,
  githubMergeMethodSchema,
  githubPrUrlSchema,
  parseGithubPrUrl,
  validateGithubPrUrl,
} from "validators/github"
import { describe, expect, it } from "vitest"

describe("githubPrUrlSchema", () => {
  const validUrls = [
    {
      url: "https://github.com/owner/repo/pull/123",
      expected: { owner: "owner", repo: "repo", prNumber: 123 },
    },
    {
      url: "https://github.com/my-org/my-repo/pull/1",
      expected: { owner: "my-org", repo: "my-repo", prNumber: 1 },
    },
    {
      url: "http://github.com/owner/repo/pull/456",
      expected: { owner: "owner", repo: "repo", prNumber: 456 },
    },
    {
      url: "github.com/owner/repo/pull/789",
      expected: { owner: "owner", repo: "repo", prNumber: 789 },
    },
    {
      url: "www.github.com/owner/repo/pull/1000",
      expected: { owner: "owner", repo: "repo", prNumber: 1000 },
    },
    {
      url: "https://www.github.com/owner/repo/pull/42",
      expected: { owner: "owner", repo: "repo", prNumber: 42 },
    },
    {
      url: "https://github.com/owner/repo/pull/123/files",
      expected: { owner: "owner", repo: "repo", prNumber: 123 },
    },
    {
      url: "https://github.com/owner/repo/pull/123/commits",
      expected: { owner: "owner", repo: "repo", prNumber: 123 },
    },
    {
      url: "https://github.com/StillScripts/cursor-agents-manager/pull/113",
      expected: {
        owner: "StillScripts",
        repo: "cursor-agents-manager",
        prNumber: 113,
      },
    },
  ]

  it.each(validUrls)("parses valid URL: $url", ({ url, expected }) => {
    const result = githubPrUrlSchema.safeParse(url)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(expected)
    }
  })

  const invalidUrls = [
    { url: "", description: "empty string" },
    { url: "not-a-url", description: "not a URL" },
    { url: "https://gitlab.com/owner/repo/pull/123", description: "GitLab URL" },
    {
      url: "https://github.com/owner/repo/issues/123",
      description: "issue URL not PR",
    },
    { url: "https://github.com/owner/repo", description: "repo URL only" },
    {
      url: "https://github.com/owner/repo/pull",
      description: "missing PR number",
    },
    {
      url: "https://github.com/owner/repo/pull/abc",
      description: "non-numeric PR number",
    },
    { url: "https://github.com//repo/pull/123", description: "missing owner" },
    { url: "https://github.com/owner//pull/123", description: "missing repo" },
  ]

  it.each(invalidUrls)("rejects invalid URL ($description): $url", ({ url }) => {
    const result = githubPrUrlSchema.safeParse(url)
    expect(result.success).toBe(false)
  })
})

describe("parseGithubPrUrl", () => {
  it("returns parsed data for valid URL", () => {
    const result = parseGithubPrUrl("https://github.com/owner/repo/pull/123")
    expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 123 })
  })

  it("returns null for invalid URL", () => {
    const result = parseGithubPrUrl("not-a-url")
    expect(result).toBeNull()
  })

  it("returns null for empty string", () => {
    const result = parseGithubPrUrl("")
    expect(result).toBeNull()
  })
})

describe("validateGithubPrUrl", () => {
  it("returns parsed data for valid URL", () => {
    const result = validateGithubPrUrl(
      "https://github.com/owner/repo/pull/123"
    )
    expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 123 })
  })

  it("throws for invalid URL", () => {
    expect(() => validateGithubPrUrl("not-a-url")).toThrow()
  })
})

describe("githubMergeMethodSchema", () => {
  it("accepts valid merge methods", () => {
    const validMethods: GithubMergeMethod[] = ["merge", "squash", "rebase"]
    for (const method of validMethods) {
      expect(() => githubMergeMethodSchema.parse(method)).not.toThrow()
    }
  })

  it("rejects invalid merge method", () => {
    expect(() => githubMergeMethodSchema.parse("invalid")).toThrow()
    expect(() => githubMergeMethodSchema.parse("")).toThrow()
  })
})

describe("Type exports", () => {
  it("GithubPrData type matches expected shape", () => {
    const data: GithubPrData = {
      owner: "owner",
      repo: "repo",
      prNumber: 123,
    }
    expect(data.owner).toBe("owner")
    expect(data.repo).toBe("repo")
    expect(data.prNumber).toBe(123)
  })

  it("GithubMergeMethod type matches expected values", () => {
    const method: GithubMergeMethod = "squash"
    expect(["merge", "squash", "rebase"]).toContain(method)
  })
})
