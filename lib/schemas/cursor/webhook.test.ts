import { describe, expect, it } from "bun:test"
import {
  type AgentStatus,
  agentStatusSchema,
  webhookEventSchema,
  webhookHeadersSchema,
  webhookPayloadSchema,
} from "@/lib/schemas/cursor/webhook"

// Test fixtures
const validWebhookHeaders = {
  "x-webhook-signature": "sha256=abc123def456",
  "x-webhook-id": "webhook-delivery-123",
  "x-webhook-event": "statusChange" as const,
}

const validWebhookHeadersWithUserAgent = {
  ...validWebhookHeaders,
  "user-agent": "Cursor-Agent-Webhook/1.0",
}

const validWebhookPayload = {
  id: "agent-123",
  status: "RUNNING" as const,
}

const validWebhookPayloadComplete = {
  id: "agent-456",
  status: "FINISHED" as const,
  name: "My Agent",
  summary: "Completed successfully",
  target: {
    url: "https://github.com/user/repo",
    branchName: "feature/docs",
    prUrl: "https://github.com/user/repo/pull/123",
    autoCreatePr: true,
  },
  source: {
    repository: "https://github.com/user/repo",
    ref: "main",
  },
  createdAt: "2024-01-01T00:00:00Z",
}

describe("webhookEventSchema", () => {
  it("accepts valid statusChange event", () => {
    expect(() => webhookEventSchema.parse("statusChange")).not.toThrow()
  })

  it("rejects invalid event types", () => {
    expect(() => webhookEventSchema.parse("invalidEvent")).toThrow()
    expect(() => webhookEventSchema.parse("status_change")).toThrow()
    expect(() => webhookEventSchema.parse("")).toThrow()
  })

  it("rejects non-string values", () => {
    expect(() => webhookEventSchema.parse(123)).toThrow()
    expect(() => webhookEventSchema.parse(null)).toThrow()
    expect(() => webhookEventSchema.parse(undefined)).toThrow()
  })
})

describe("agentStatusSchema", () => {
  it("accepts all valid status values", () => {
    const validStatuses: AgentStatus[] = [
      "CREATING",
      "RUNNING",
      "FINISHED",
      "ERROR",
      "EXPIRED",
    ]

    validStatuses.forEach((status) => {
      expect(() => agentStatusSchema.parse(status)).not.toThrow()
    })
  })

  it("rejects invalid status values", () => {
    expect(() => agentStatusSchema.parse("INVALID")).toThrow()
    expect(() => agentStatusSchema.parse("running")).toThrow() // lowercase
    expect(() => agentStatusSchema.parse("CREATED")).toThrow()
    expect(() => agentStatusSchema.parse("")).toThrow()
  })

  it("rejects non-string values", () => {
    expect(() => agentStatusSchema.parse(123)).toThrow()
    expect(() => agentStatusSchema.parse(null)).toThrow()
    expect(() => agentStatusSchema.parse(undefined)).toThrow()
  })
})

describe("webhookHeadersSchema", () => {
  it("accepts valid headers with all required fields", () => {
    expect(() => webhookHeadersSchema.parse(validWebhookHeaders)).not.toThrow()
  })

  it("accepts headers with optional user-agent", () => {
    expect(() =>
      webhookHeadersSchema.parse(validWebhookHeadersWithUserAgent)
    ).not.toThrow()
  })

  it("accepts headers without user-agent", () => {
    expect(() => webhookHeadersSchema.parse(validWebhookHeaders)).not.toThrow()
  })

  it("rejects missing required x-webhook-signature", () => {
    const headers = {
      "x-webhook-id": "webhook-delivery-123",
      "x-webhook-event": "statusChange",
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })

  it("rejects missing required x-webhook-id", () => {
    const headers = {
      "x-webhook-signature": "sha256=abc123",
      "x-webhook-event": "statusChange",
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })

  it("rejects missing required x-webhook-event", () => {
    const headers = {
      "x-webhook-signature": "sha256=abc123",
      "x-webhook-id": "webhook-delivery-123",
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })

  it("rejects invalid x-webhook-event value", () => {
    const headers = {
      ...validWebhookHeaders,
      "x-webhook-event": "invalidEvent",
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })

  it("rejects non-string x-webhook-signature", () => {
    const headers = {
      ...validWebhookHeaders,
      "x-webhook-signature": 123,
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })

  it("rejects non-string x-webhook-id", () => {
    const headers = {
      ...validWebhookHeaders,
      "x-webhook-id": 123,
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })

  it("rejects non-string user-agent when provided", () => {
    const headers = {
      ...validWebhookHeaders,
      "user-agent": 123,
    }
    expect(() => webhookHeadersSchema.parse(headers)).toThrow()
  })
})

describe("webhookPayloadSchema", () => {
  it("validates minimal payload with only required fields", () => {
    expect(() => webhookPayloadSchema.parse(validWebhookPayload)).not.toThrow()
  })

  it("validates complete payload with all optional fields", () => {
    expect(() =>
      webhookPayloadSchema.parse(validWebhookPayloadComplete)
    ).not.toThrow()
  })

  it("validates payload with partial optional fields", () => {
    const payload = {
      id: "agent-789",
      status: "ERROR" as const,
      name: "Error Agent",
      summary: "Something went wrong",
    }
    expect(() => webhookPayloadSchema.parse(payload)).not.toThrow()
  })

  it("validates payload with only target field", () => {
    const payload = {
      id: "agent-101",
      status: "CREATING" as const,
      target: {
        branchName: "feature/test",
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).not.toThrow()
  })

  it("validates payload with only source field", () => {
    const payload = {
      id: "agent-202",
      status: "EXPIRED" as const,
      source: {
        repository: "https://github.com/user/repo",
        ref: "main",
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).not.toThrow()
  })

  it("rejects missing required id field", () => {
    const payload = {
      status: "RUNNING" as const,
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects missing required status field", () => {
    const payload = {
      id: "agent-303",
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string id", () => {
    const payload = {
      id: 123,
      status: "RUNNING" as const,
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects invalid status value", () => {
    const payload = {
      id: "agent-404",
      status: "INVALID_STATUS",
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string name when provided", () => {
    const payload = {
      id: "agent-505",
      status: "RUNNING" as const,
      name: 123,
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string summary when provided", () => {
    const payload = {
      id: "agent-606",
      status: "RUNNING" as const,
      summary: 123,
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string createdAt when provided", () => {
    const payload = {
      id: "agent-707",
      status: "RUNNING" as const,
      createdAt: 123,
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("allows extra fields in target object (Zod allows unknown fields by default)", () => {
    const payload = {
      id: "agent-808",
      status: "RUNNING" as const,
      target: {
        invalidField: "value",
      },
    }
    // Zod allows extra fields unless .strict() is used
    expect(() => webhookPayloadSchema.parse(payload)).not.toThrow()
  })

  it("rejects non-boolean autoCreatePr in target", () => {
    const payload = {
      id: "agent-909",
      status: "RUNNING" as const,
      target: {
        autoCreatePr: "true",
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string url in target", () => {
    const payload = {
      id: "agent-1010",
      status: "RUNNING" as const,
      target: {
        url: 123,
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string branchName in target", () => {
    const payload = {
      id: "agent-1111",
      status: "RUNNING" as const,
      target: {
        branchName: 123,
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string prUrl in target", () => {
    const payload = {
      id: "agent-1212",
      status: "RUNNING" as const,
      target: {
        prUrl: 123,
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string repository in source", () => {
    const payload = {
      id: "agent-1313",
      status: "RUNNING" as const,
      source: {
        repository: 123,
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })

  it("rejects non-string ref in source", () => {
    const payload = {
      id: "agent-1414",
      status: "RUNNING" as const,
      source: {
        ref: 123,
      },
    }
    expect(() => webhookPayloadSchema.parse(payload)).toThrow()
  })
})
