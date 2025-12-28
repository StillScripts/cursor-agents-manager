/**
 * Bun test preload script
 *
 * This file is loaded BEFORE any test files, allowing us to set up
 * module mocks before the actual modules are imported.
 *
 * Run tests with: bun test --preload ./app/api/_lib/__tests__/preload.ts
 */

import { mock } from "bun:test"

// ============================================================================
// Mock State (shared across all tests)
// ============================================================================

// Use globalThis to share state between preload and test files
const mockState = {
  authenticated: true,
  simulationMode: true,
  apiKey: null as string | null,
  dbResults: {
    apiKeys: [
      {
        id: "apikey_123",
        userId: "user_123",
        encryptedApiKey: "encrypted:cursor_api_key_abc123",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
    repositories: [
      {
        id: 1,
        userId: "user_123",
        url: "https://github.com/user/repo1",
        name: "repo1",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: 2,
        userId: "user_123",
        url: "https://github.com/user/repo2",
        name: "repo2",
        createdAt: new Date("2024-01-02"),
      },
    ],
    branches: [
      {
        id: 1,
        userId: "user_123",
        name: "main",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: 2,
        userId: "user_123",
        name: "develop",
        createdAt: new Date("2024-01-02"),
      },
    ],
  },
  cursorApiResponse: {
    ok: true,
    status: 200,
    data: {} as unknown,
  },
}

// Make mockState available globally
;(globalThis as Record<string, unknown>).__testMockState = mockState

// ============================================================================
// Mock User Data
// ============================================================================

const mockUser = {
  id: "user_123",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

const mockSession = {
  id: "session_123",
  userId: "user_123",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  token: "mock_token_abc123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

// ============================================================================
// Mock: @/lib/auth
// ============================================================================

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => {
        const state = (globalThis as Record<string, unknown>)
          .__testMockState as typeof mockState
        if (!state.authenticated) return null
        return { user: mockUser, session: mockSession }
      },
    },
  },
}))

// ============================================================================
// Mock: @/lib/db
// ============================================================================

const createChainableMock = () => {
  let currentTable: string | null = null

  const getResults = () => {
    const state = (globalThis as Record<string, unknown>)
      .__testMockState as typeof mockState
    switch (currentTable) {
      case "userApiKeys":
        return state.dbResults.apiKeys
      case "repositories":
        return state.dbResults.repositories
      case "branches":
        return state.dbResults.branches
      default:
        return []
    }
  }

  const chainMock: Record<string, unknown> = {
    from: (table: unknown) => {
      if (table && typeof table === "object") {
        const tableObj = table as Record<string, unknown>
        if ("encryptedApiKey" in tableObj) currentTable = "userApiKeys"
        else if ("url" in tableObj) currentTable = "repositories"
        else if ("name" in tableObj && !("url" in tableObj))
          currentTable = "branches"
      }
      return chainMock
    },
    where: () => chainMock,
    orderBy: () => Promise.resolve(getResults()),
    limit: () => Promise.resolve(getResults()),
  }

  return chainMock
}

mock.module("@/lib/db", () => ({
  db: {
    select: () => createChainableMock(),
    insert: () => ({
      values: () => Promise.resolve(),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve(),
    }),
  },
}))

// ============================================================================
// Mock: @/lib/encryption
// ============================================================================

mock.module("@/lib/encryption", () => ({
  encryptData: (data: string) => `encrypted:${data}`,
  decryptData: (data: string) => {
    if (data.startsWith("encrypted:")) {
      return data.replace("encrypted:", "")
    }
    return "cursor_api_key_abc123"
  },
}))

// ============================================================================
// Mock: @/lib/mock-data
// ============================================================================

const mockAgent = {
  id: "bc_agent123",
  name: "Test Agent",
  status: "RUNNING" as const,
  source: {
    repository: "https://github.com/user/repo",
    ref: "main",
  },
  target: {
    url: "https://cursor.com/agents?id=bc_agent123",
    branchName: "cursor/task-123",
    autoCreatePr: false,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
}

const mockAgentsList = [
  mockAgent,
  {
    ...mockAgent,
    id: "bc_agent456",
    name: "Second Agent",
    status: "FINISHED" as const,
  },
]

const mockConversation = {
  id: "bc_agent123",
  messages: [
    { id: "msg_1", type: "user_message", text: "Add a README file" },
    {
      id: "msg_2",
      type: "assistant_message",
      text: "I'll add a README file for you.",
    },
  ],
}

mock.module("@/lib/mock-data", () => ({
  getSimulatedAgents: () => mockAgentsList,
  getSimulatedAgentsPaginated: (page: number, limit: number) => ({
    agents: mockAgentsList.slice(page * limit, (page + 1) * limit),
    total: mockAgentsList.length,
    totalPages: Math.ceil(mockAgentsList.length / limit),
  }),
  getSimulatedConversation: (id: string) => {
    if (id === mockAgent.id) return mockConversation
    return null
  },
  addSimulatedAgent: () => {},
  removeSimulatedAgent: () => {},
  updateSimulatedAgentStatus: () => {},
  addMessageToConversation: () => {},
}))

// ============================================================================
// Mock: Global fetch
// ============================================================================

const originalFetch = globalThis.fetch

globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = url.toString()
  const state = (globalThis as Record<string, unknown>)
    .__testMockState as typeof mockState

  // Cursor API calls
  if (urlStr.includes("api.cursor.com")) {
    if (!state.cursorApiResponse.ok) {
      return new Response(JSON.stringify({ error: "API Error" }), {
        status: state.cursorApiResponse.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(state.cursorApiResponse.data), {
      status: state.cursorApiResponse.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Fallback to original fetch
  return originalFetch(url, init)
}) as typeof fetch

console.log("[Test Preload] Mocks initialized")
