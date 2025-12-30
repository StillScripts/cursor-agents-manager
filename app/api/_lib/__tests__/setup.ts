/**
 * Test helpers for Hono API routes
 *
 * Mocks are set up in preload.ts - this file provides helper functions
 * for accessing and modifying mock state during tests.
 *
 * SIMULATION MODE:
 * Simulation mode is determined by whether the user has a valid Cursor API key.
 * Use the helper functions below to control this in tests:
 * - withValidApiKey() → live mode (calls mocked Cursor API)
 * - withoutApiKey() → simulation mode (uses mock data)
 *
 * Run tests with: bun test --preload ./app/api/_lib/__tests__/preload.ts app/api/_lib
 */

// ============================================================================
// Type Definitions
// ============================================================================

type ApiKeyRecord = {
  id: string
  userId: string
  encryptedApiKey: string
  createdAt: Date
  updatedAt: Date
}

type MockState = {
  authenticated: boolean
  dbResults: {
    apiKeys: ApiKeyRecord[]
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
    timeLogs: Array<{
      id: number
      userId: string
      taskId: string
      activityType: "task_creation" | "conversation_review"
      startTime: Date
      endTime: Date | null
      duration: number | null
      createdAt: Date
    }>
  }
  cursorApiResponse: {
    ok: boolean
    status: number
    data: unknown
  }
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_API_KEY: ApiKeyRecord = {
  id: "apikey_123",
  userId: "user_123",
  encryptedApiKey: "encrypted:cursor_api_key_abc123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

// ============================================================================
// Mock State Access
// ============================================================================

/**
 * Get the current mock state
 */
export function getMockState(): MockState {
  return (globalThis as Record<string, unknown>).__testMockState as MockState
}

/**
 * Reset mock state to defaults (authenticated user with valid API key = live mode)
 */
export function resetMockState(): void {
  const state = getMockState()
  state.authenticated = true
  state.dbResults = {
    apiKeys: [{ ...DEFAULT_API_KEY }],
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
    timeLogs: [
      {
        id: 1,
        userId: "user_123",
        taskId: "bc_agent123",
        activityType: "task_creation",
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:05:00Z"),
        duration: 5 * 60 * 1000,
        createdAt: new Date("2024-01-01T10:05:00Z"),
      },
      {
        id: 2,
        userId: "user_123",
        taskId: "bc_agent123",
        activityType: "conversation_review",
        startTime: new Date("2024-01-01T11:00:00Z"),
        endTime: new Date("2024-01-01T11:10:00Z"),
        duration: 10 * 60 * 1000,
        createdAt: new Date("2024-01-01T11:10:00Z"),
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
// API Key Control (determines simulation vs live mode)
// ============================================================================

/**
 * Set up a valid API key for the user.
 * This enables LIVE MODE - requests will call the mocked Cursor API.
 *
 * @param apiKey - Optional custom API key value (defaults to "cursor_api_key_abc123")
 */
export function withValidApiKey(apiKey = "cursor_api_key_abc123"): void {
  const state = getMockState()
  state.dbResults.apiKeys = [
    {
      ...DEFAULT_API_KEY,
      encryptedApiKey: `encrypted:${apiKey}`,
    },
  ]
}

/**
 * Remove the user's API key.
 * This enables SIMULATION MODE - requests will use mock data.
 */
export function withoutApiKey(): void {
  const state = getMockState()
  state.dbResults.apiKeys = []
}

/**
 * Check if the current mock state is in simulation mode.
 * Simulation mode is active when the user has no valid API key.
 */
export function isInSimulationMode(): boolean {
  const state = getMockState()
  return state.dbResults.apiKeys.length === 0
}

// ============================================================================
// Authentication Control
// ============================================================================

/**
 * Set the user as authenticated (has valid session)
 */
export function withAuthentication(): void {
  const state = getMockState()
  state.authenticated = true
}

/**
 * Set the user as unauthenticated (no session)
 */
export function withoutAuthentication(): void {
  const state = getMockState()
  state.authenticated = false
}

// ============================================================================
// Cursor API Response Control
// ============================================================================

/**
 * Configure the mocked Cursor API response.
 * Only used in live mode (when user has a valid API key).
 */
export function setCursorApiResponse(
  data: unknown,
  options: { ok?: boolean; status?: number } = {}
): void {
  const state = getMockState()
  state.cursorApiResponse = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    data,
  }
}

/**
 * Configure the mocked Cursor API to return an error.
 */
export function setCursorApiError(status = 500): void {
  const state = getMockState()
  state.cursorApiResponse = {
    ok: false,
    status,
    data: { error: "API Error" },
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
