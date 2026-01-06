import { describe, expect, it } from "vitest"
import {
  formDataToApiRequest,
  type LaunchAgentFormData,
  launchAgentFormSchema,
  launchAgentRequestSchema,
  promptSchema,
  sourceSchema,
  webhookSchema,
} from "@/lib/validators/cursor/launch-agent"

// Test fixtures
const validSource = {
  repository: "https://github.com/user/repo",
  ref: "main",
}

const validPrompt = {
  text: "Add a README file",
}

const validFormPrompt = {
  text: "Add a README file to the repository",
}

const validImage = {
  data: "base64encodeddata",
  dimension: { width: 1024, height: 768 },
}

const validTarget = {
  autoCreatePr: true,
  openAsCursorGithubApp: false,
  skipReviewerRequest: false,
  branchName: "feature/docs",
}

const validWebhook = {
  url: "https://example.com/webhook",
  secret: "a".repeat(32),
}

describe("promptSchema", () => {
  it("accepts valid prompt with text only", () => {
    expect(() => promptSchema.parse(validPrompt)).not.toThrow()
  })

  it("accepts prompt with images", () => {
    const prompt = { ...validPrompt, images: [validImage] }
    expect(() => promptSchema.parse(prompt)).not.toThrow()
  })

  it("rejects prompt with more than 5 images", () => {
    const prompt = {
      ...validPrompt,
      images: Array(6).fill(validImage),
    }
    expect(() => promptSchema.parse(prompt)).toThrow()
  })

  it("rejects empty text", () => {
    expect(() => promptSchema.parse({ text: "" })).toThrow()
  })
})

describe("sourceSchema", () => {
  it("accepts valid GitHub URL with ref", () => {
    expect(() => sourceSchema.parse(validSource)).not.toThrow()
  })

  it("accepts valid GitHub URL without ref", () => {
    const source = { repository: "https://github.com/user/repo" }
    expect(() => sourceSchema.parse(source)).not.toThrow()
  })

  it("rejects non-URL string", () => {
    expect(() =>
      sourceSchema.parse({ repository: "not-a-url", ref: "main" })
    ).toThrow()
  })

  it("rejects non-GitHub URLs", () => {
    expect(() =>
      sourceSchema.parse({
        repository: "https://gitlab.com/user/repo",
        ref: "main",
      })
    ).toThrow()
  })

  it("rejects empty ref when provided", () => {
    expect(() =>
      sourceSchema.parse({
        repository: "https://github.com/user/repo",
        ref: "",
      })
    ).toThrow()
  })
})

describe("webhookSchema", () => {
  it("accepts valid webhook with secret", () => {
    expect(() => webhookSchema.parse(validWebhook)).not.toThrow()
  })

  it("accepts webhook without secret", () => {
    const webhook = { url: "https://example.com/webhook" }
    expect(() => webhookSchema.parse(webhook)).not.toThrow()
  })

  it("rejects secret shorter than 32 characters", () => {
    expect(() =>
      webhookSchema.parse({
        url: "https://example.com/webhook",
        secret: "tooshort",
      })
    ).toThrow()
  })

  it("rejects invalid URL", () => {
    expect(() => webhookSchema.parse({ url: "not-a-url" })).toThrow()
  })
})

describe("launchAgentRequestSchema", () => {
  it("validates minimal request", () => {
    const request = { prompt: validPrompt, source: validSource }
    expect(() => launchAgentRequestSchema.parse(request)).not.toThrow()
  })

  it("validates request without ref", () => {
    const request = {
      prompt: validPrompt,
      source: { repository: "https://github.com/user/repo" },
    }
    expect(() => launchAgentRequestSchema.parse(request)).not.toThrow()
  })

  it("validates complete request with all options", () => {
    const request = {
      prompt: { ...validPrompt, images: [validImage] },
      source: validSource,
      model: "claude-3-5-sonnet-20241022",
      target: validTarget,
      webhook: validWebhook,
    }
    expect(() => launchAgentRequestSchema.parse(request)).not.toThrow()
  })

  it("accepts any string as model", () => {
    const request = {
      prompt: validPrompt,
      source: validSource,
      model: "future-model-2025",
    }
    expect(() => launchAgentRequestSchema.parse(request)).not.toThrow()
  })
})

describe("launchAgentFormSchema", () => {
  const validFormData = {
    prompt: validFormPrompt,
    source: validSource,
    target: validTarget,
  }

  it("validates complete form data", () => {
    expect(() => launchAgentFormSchema.parse(validFormData)).not.toThrow()
  })

  it("rejects prompt text shorter than 10 characters", () => {
    const data = {
      ...validFormData,
      prompt: { text: "Too short" },
    }
    expect(() => launchAgentFormSchema.parse(data)).toThrow()
  })

  it("rejects prompt text longer than 5000 characters", () => {
    const data = {
      ...validFormData,
      prompt: { text: "x".repeat(5001) },
    }
    expect(() => launchAgentFormSchema.parse(data)).toThrow()
  })

  it("requires ref in form source", () => {
    const data = {
      ...validFormData,
      source: { repository: "https://github.com/user/repo" },
    }
    expect(() => launchAgentFormSchema.parse(data)).toThrow()
  })

  it("rejects ref longer than 100 characters", () => {
    const data = {
      ...validFormData,
      source: { ...validSource, ref: "x".repeat(101) },
    }
    expect(() => launchAgentFormSchema.parse(data)).toThrow()
  })

  it("rejects invalid branch name characters", () => {
    const data = {
      ...validFormData,
      target: { ...validTarget, branchName: "feature/docs with spaces" },
    }
    expect(() => launchAgentFormSchema.parse(data)).toThrow()
  })

  it("accepts valid branch name with special characters", () => {
    const data = {
      ...validFormData,
      target: { ...validTarget, branchName: "feature/my-branch_v2" },
    }
    expect(() => launchAgentFormSchema.parse(data)).not.toThrow()
  })

  it("validates GitHub URL has owner and repo path", () => {
    const data = {
      ...validFormData,
      source: { repository: "https://github.com", ref: "main" },
    }
    expect(() => launchAgentFormSchema.parse(data)).toThrow()
  })
})

describe("formDataToApiRequest", () => {
  const baseFormData: LaunchAgentFormData = {
    prompt: validFormPrompt,
    source: validSource,
    target: validTarget,
  }

  it("converts complete form data to API request", () => {
    const formData: LaunchAgentFormData = {
      ...baseFormData,
      model: "claude-3-5-sonnet-20241022",
    }

    const result = formDataToApiRequest(formData)

    expect(result).toEqual({
      prompt: formData.prompt,
      source: formData.source,
      model: formData.model,
      target: formData.target,
    })
  })

  it("omits model when undefined", () => {
    const result = formDataToApiRequest(baseFormData)
    expect(result.model).toBeUndefined()
  })

  it("does not include webhook (injected from env vars at API level)", () => {
    const result = formDataToApiRequest(baseFormData)
    expect(result.webhook).toBeUndefined()
  })

  it("includes target when any target field is set", () => {
    const formData: LaunchAgentFormData = {
      ...baseFormData,
      target: {
        autoCreatePr: false,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
      },
    }
    const result = formDataToApiRequest(formData)
    expect(result.target).toBeDefined()
  })

  it("omits branchName from target when not provided", () => {
    const formData: LaunchAgentFormData = {
      ...baseFormData,
      target: {
        autoCreatePr: true,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
      },
    }
    const result = formDataToApiRequest(formData)
    expect(result.target?.branchName).toBeUndefined()
  })
})
