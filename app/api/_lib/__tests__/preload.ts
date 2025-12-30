/**
 * Bun test preload script
 *
 * This file is loaded BEFORE any test files, allowing us to set up
 * module mocks before the actual modules are imported.
 *
 * Run tests with: bun test --preload ./app/api/_lib/__tests__/preload.ts
 *
 * SIMULATION MODE:
 * Simulation mode is determined by whether the user has a valid Cursor API key.
 * - When dbResults.apiKeys is empty → simulation mode (uses mock data)
 * - When dbResults.apiKeys has a valid key → live mode (calls Cursor API)
 */

import { mock } from "bun:test"

// ============================================================================
// Default Mock Data
// ============================================================================

const DEFAULT_API_KEY = {
  id: "apikey_123",
  userId: "user_123",
  encryptedApiKey: "encrypted:cursor_api_key_abc123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

const DEFAULT_REPOSITORIES = [
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
]

const DEFAULT_BRANCHES = [
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
]

const DEFAULT_TIME_LOGS = [
  {
    id: 1,
    userId: "user_123",
    taskId: "bc_agent123",
    activityType: "task_creation" as const,
    startTime: new Date("2024-01-01T10:00:00Z"),
    endTime: new Date("2024-01-01T10:05:00Z"),
    duration: 5 * 60 * 1000, // 5 minutes in milliseconds
    createdAt: new Date("2024-01-01T10:05:00Z"),
  },
  {
    id: 2,
    userId: "user_123",
    taskId: "bc_agent123",
    activityType: "conversation_review" as const,
    startTime: new Date("2024-01-01T11:00:00Z"),
    endTime: new Date("2024-01-01T11:10:00Z"),
    duration: 10 * 60 * 1000, // 10 minutes in milliseconds
    createdAt: new Date("2024-01-01T11:10:00Z"),
  },
]

// ============================================================================
// Mock State (shared across all tests)
// ============================================================================

/**
 * Mock state controls the behavior of mocked modules.
 *
 * IMPORTANT: Simulation mode is determined by `dbResults.apiKeys`:
 * - Empty array = no API key = simulation mode
 * - Array with valid key = live mode (calls mocked Cursor API)
 */
const mockState = {
  // Whether the user is authenticated (has valid session)
  authenticated: true,

  // Database results - controls what queries return
  dbResults: {
    // API keys determine simulation vs live mode
    // Empty = simulation mode, has key = live mode
    apiKeys: [{ ...DEFAULT_API_KEY }],
    repositories: [...DEFAULT_REPOSITORIES],
    branches: [...DEFAULT_BRANCHES],
    timeLogs: [...DEFAULT_TIME_LOGS],
  },

  // Controls the mocked Cursor API response (only used in live mode)
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
  let whereConditions: Array<{ field: string; value: unknown }> = []

  const getResults = () => {
    const state = (globalThis as Record<string, unknown>)
      .__testMockState as typeof mockState
    let results: unknown[] = []
    
    switch (currentTable) {
      case "userApiKeys":
        results = state.dbResults.apiKeys
        break
      case "repositories":
        results = state.dbResults.repositories
        break
      case "branches":
        results = state.dbResults.branches
        break
      case "timeLogs":
        results = state.dbResults.timeLogs
        break
      default:
        return []
    }

    // Apply where conditions - handle both single eq() and and(eq(), eq())
    // For user-specific tables, always filter by userId if not already filtered
    if (currentTable === "timeLogs" || currentTable === "repositories" || currentTable === "branches") {
      const hasUserIdFilter = whereConditions.some(c => c.field === "userId")
      if (!hasUserIdFilter) {
        // Default to filtering by the test user
        whereConditions.push({ field: "userId", value: "user_123" })
      }
    }
    
    if (whereConditions.length > 0) {
      results = results.filter((item) => {
        if (typeof item !== "object" || item === null) return false
        const itemObj = item as Record<string, unknown>
        return whereConditions.every((condition) => {
          // Handle nested objects (drizzle conditions can be nested)
          const fieldValue = itemObj[condition.field]
          return fieldValue === condition.value
        })
      })
    }

    return results
  }

  const extractConditions = (condition: unknown): void => {
    if (!condition || typeof condition !== "object") return
    
    const cond = condition as Record<string, unknown>
    
    // Drizzle's eq() and and() return objects with a specific structure
    // For testing, we'll check for the actual values that get passed
    // The condition object may have nested structures from and() or eq()
    
    // Try to extract userId and taskId from the condition
    // Drizzle conditions are complex, so we'll use a simple approach:
    // Check if the condition object has properties that match our fields
    const checkNested = (obj: unknown, depth = 0): void => {
      if (depth > 3 || !obj || typeof obj !== "object") return
      
      const objRecord = obj as Record<string, unknown>
      
      // Check for direct field matches
      if ("userId" in objRecord && objRecord.userId !== undefined) {
        whereConditions.push({ field: "userId", value: objRecord.userId })
      }
      if ("taskId" in objRecord && objRecord.taskId !== undefined) {
        whereConditions.push({ field: "taskId", value: objRecord.taskId })
      }
      if ("id" in objRecord && objRecord.id !== undefined) {
        whereConditions.push({ field: "id", value: objRecord.id })
      }
      
      // Recursively check nested objects (for and() conditions)
      Object.values(objRecord).forEach((value) => {
        if (value && typeof value === "object") {
          checkNested(value, depth + 1)
        }
      })
    }
    
    checkNested(cond)
  }

  const chainMock: Record<string, unknown> = {
    from: (table: unknown) => {
      whereConditions = []
      if (table && typeof table === "object") {
        const tableObj = table as Record<string, unknown>
        if ("encryptedApiKey" in tableObj) currentTable = "userApiKeys"
        else if ("url" in tableObj) currentTable = "repositories"
        else if ("name" in tableObj && !("url" in tableObj) && !("activityType" in tableObj))
          currentTable = "branches"
        else if ("activityType" in tableObj) currentTable = "timeLogs"
      }
      return chainMock
    },
    where: (condition: unknown) => {
      extractConditions(condition)
      return chainMock
    },
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
// Mock: @/lib/mock-data (simulation mode data)
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
// Mock: Global fetch (Cursor API)
// ============================================================================

const originalFetch = globalThis.fetch

globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = url.toString()
  const state = (globalThis as Record<string, unknown>)
    .__testMockState as typeof mockState

  // Cursor API calls (only reached in live mode when user has API key)
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
