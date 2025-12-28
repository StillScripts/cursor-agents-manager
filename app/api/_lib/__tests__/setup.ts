/**
 * Test helpers for Hono API routes
 *
 * Mocks are set up in preload.ts - this file provides helper functions
 * for accessing and modifying mock state during tests.
 *
 * Run tests with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib
 */

// ============================================================================
// Mock State Access
// ============================================================================

type MockState = {
  authenticated: boolean
  simulationMode: boolean
  apiKey: string | null
  dbResults: {
    apiKeys: Array<{
      id: string
      userId: string
      encryptedApiKey: string
      createdAt: Date
      updatedAt: Date
    }>
    repositories: Array<{
      id: number
      userId: string
      url: string
      name: string
      createdAt: Date
    }>
    branches: Array<{
      id: number
      userId: string
      name: string
      createdAt: Date
    }>
  }
  cursorApiResponse: {
    ok: boolean
    status: number
    data: unknown
  }
}

/**
 * Get the current mock state
 */
export function getMockState(): MockState {
  return (globalThis as Record<string, unknown>).__testMockState as MockState
}

/**
 * Reset mock state to defaults
 */
export function resetMockState(): void {
  const state = getMockState()
  state.authenticated = true
  state.simulationMode = true
  state.apiKey = null
  state.dbResults = {
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
  }
  state.cursorApiResponse = {
    ok: true,
    status: 200,
    data: {},
  }
}

// ============================================================================
// Mock Data Exports
// ============================================================================

export const mockAgent = {
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

export const mockAgentsList = [
  mockAgent,
  {
    ...mockAgent,
    id: "bc_agent456",
    name: "Second Agent",
    status: "FINISHED" as const,
  },
]
