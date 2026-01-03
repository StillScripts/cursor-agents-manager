# AGENTS.md

This file provides comprehensive guidance to AI agents (Claude Code, Cursor, etc.) when working with code in this repository.

## Project Overview

Cursor Agent Manager is a mobile-first Next.js 16 (App Router) application for managing Cursor background agents on the go. The app uses React 19, TypeScript, Tailwind CSS 4, and operates in either simulation mode (with mock data) or live mode (connected to the Cursor API).

## Development Commands

**Package Manager**: This project uses **Bun** (not npm/pnpm/yarn). See `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc` for details.

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Lint - USE THIS to check for errors
bun run lint

# Format code with Biome (CRITICAL - run before committing)
bun run lint:fix
# OR
bun run format

# Run tests
bun test

# Run API tests specifically
bun test lib/hono

# Watch mode for tests
bun test --watch
```

## Code Formatting (CRITICAL)

**CRITICAL FOR AI AGENTS**: Code formatting and linting is enforced via **GitHub Actions**:

1. **Lint Check (main branch)**: Runs on every push to `main`, checks for linting errors and **fails the workflow** if errors exist
2. **Lint Check & Fix (PRs)**: Runs on every PR to `main`, auto-fixes issues, and **fails the workflow** if unfixable errors remain

The GitHub Actions will:
- **On main branch**: Check for linting errors using `bun run lint` and fail if any exist
- **On PRs**: Auto-fix linting issues using `bun run lint:fix`, then check for remaining errors using `bun run lint`, and **fail the workflow** if any unfixable errors exist (prevents merging)

**⚠️ MANDATORY FOR AI AGENTS**: 
1. **ALWAYS** run `bun run lint:fix` after making code changes and BEFORE pushing
2. **NEVER** push code that has linting errors - the GitHub Action will fail and block merging
3. **ALWAYS** verify with `bun run lint` that no errors remain before pushing

**For AI Agents**: You MUST run `bun run lint:fix` manually after making code changes to:
- Catch issues early in your workflow
- Avoid GitHub Action failures
- Ensure code is properly formatted before pushing
- **Prevent PRs from being blocked by linting errors**

```bash
bun run lint:fix
```

This command will:
- Auto-fix linting issues
- Format code according to project standards
- Ensure consistent code style across the codebase
- Exit with error code if unfixable issues remain

**Rule**: **ALWAYS** run `bun run lint:fix` after making code changes and before pushing. The GitHub Actions will enforce this automatically, but you must fix issues before attempting to push.

## Testing & Validation

**IMPORTANT FOR AI AGENTS**: When validating code changes or checking for errors:

**DO**: Use `bun run lint` to check for errors and validate code
- Fast and safe
- Doesn't interfere with running dev servers
- Catches TypeScript, linting, and formatting issues

**DON'T**: Run `bun run dev` to check for errors
- Interferes with already-running dev servers
- Causes port conflicts and lock file issues
- Wastes resources and time
- Provides no better validation than lint

**Rule**: Always use `bun run lint` for validation. Never start the dev server just to check if code works.

## Architecture

### Route Groups (Next.js App Router)

The app uses Next.js route groups to organize pages by authentication state:

```
app/
├── (authenticated)/              # Pages requiring login
│   ├── layout.tsx                # Shared layout with nav
│   ├── _components/              # Private components
│   │   ├── bottom-nav.tsx        # Mobile bottom navigation
│   │   ├── desktop-header.tsx    # Desktop header navigation
│   │   └── nav-items.ts          # Shared navigation items config
│   ├── page.tsx                  # Home: agent list view
│   ├── new/page.tsx              # Launch new agent form
│   ├── agent/[id]/page.tsx       # Agent detail/conversation view
│   ├── settings/page.tsx         # Settings page
│   └── account/page.tsx          # Account page
│
├── (unauthenticated)/            # Public pages (no auth required)
│   ├── login/page.tsx            # Login page
│   └── signup/page.tsx           # Signup page
│
├── (server)/                     # API routes (server-only)
│   └── api/
│       ├── auth/[...all]/route.ts   # Better Auth endpoints
│       └── [...route]/route.ts      # Hono catch-all handler
│
└── layout.tsx                    # Root layout with providers
```

**Key Concepts**:
- `(authenticated)` - Pages wrapped with auth layout containing navigation
- `(unauthenticated)` - Standalone auth pages without app navigation
- `(server)` - API routes handled by Hono and Better Auth
- `_components/` - Private folder (underscore prefix) not treated as routes

### Hono API Architecture

The API layer uses **Hono** mounted as a catch-all route handler at `app/(server)/api/[...route]/route.ts`. This provides:
- **Modular routes** - Each domain (agents, user, models) in separate files
- **Type-safe validation** - `@hono/zod-validator` for request validation
- **Middleware composition** - Reusable auth and simulation mode middleware
- **Cleaner code** - Chainable routes with typed context

**Directory Structure**:
```
lib/hono/
├── index.ts                      # Main Hono app - combines all routes
├── middleware/
│   ├── auth.ts                   # requireAuth middleware
│   ├── error-handler.ts          # Global error handling
│   └── simulation.ts             # Simulation mode detection
├── routes/
│   ├── agents.ts                 # /api/agents routes
│   ├── models.ts                 # /api/models routes
│   └── user.ts                   # /api/user routes
└── __tests__/                    # API tests
    ├── preload.ts                # Bun test preload (mocks)
    ├── setup.ts                  # Test helpers
    └── routes/
        ├── agents.test.ts
        ├── models.test.ts
        ├── user.test.ts
        └── index.test.ts
```

**Route Handler Pattern** (`lib/hono/routes/agents.ts`):
```typescript
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAuth, type AuthVariables } from "@/lib/hono/middleware/auth"
import { withSimulationMode, type SimulationVariables } from "@/lib/hono/middleware/simulation"

type Variables = AuthVariables & SimulationVariables

const app = new Hono<{ Variables: Variables }>()

// Apply middleware
app.use("*", requireAuth)
app.use("*", withSimulationMode)

// Define routes
app.get("/", zValidator("query", paginationSchema), async (c) => {
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")
  // ... route logic
})

export { app as agentsApp }
```

**Middleware**:
- `requireAuth` - Sets `user` and `session` in context, returns 401 if unauthenticated
- `withSimulationMode` - Sets `simulationMode` (boolean) and `apiKey` (string | null) in context
- `errorHandler` - Catches errors and returns consistent JSON responses

**Note**: Better Auth remains as a separate Next.js route handler at `app/(server)/api/auth/[...all]/route.ts` because it requires special cookie handling via `toNextJsHandler`.

### TanStack Form Integration

The app uses TanStack React Form with a custom form hook pattern for consistent form handling.

**Form Hook Setup** (`lib/hooks/use-app-form.tsx`):
```typescript
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { ControlledInput, ControlledTextarea, ControlledSelect, ControlledSwitch, ControlledArrayField } from "@/components/form-fields"
import { SubscribeButton } from "@/components/subscribe-button"

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()
export const FormProvider = formContext.Provider

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    ControlledInput,
    ControlledTextarea,
    ControlledSelect,
    ControlledSwitch,
    ControlledArrayField,
  },
  formComponents: {
    SubscribeButton,
  },
})

export { useAppForm }
```

**Form Usage Pattern** (`components/forms/launch-agent-form.tsx`):
```typescript
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { launchAgentFormSchema, type LaunchAgentFormData } from "@/lib/schemas/cursor/launch-agent"

export function LaunchAgentForm() {
  const form = useAppForm<LaunchAgentFormData>({
    defaultValues: {
      prompt: { text: "", images: [] },
      source: { repository: "", ref: "" },
      // ...
    },
    validators: {
      onSubmit: launchAgentFormSchema, // Zod schema for validation
    },
    onSubmit: async ({ value }) => {
      // Handle form submission
    },
  })

  return (
    <FormProvider value={form}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        <form.AppField name="prompt.text">
          {(field) => (
            <field.ControlledTextarea
              field={field}
              label="Task Description"
              description="..."
              placeholder="..."
            />
          )}
        </form.AppField>
        {/* More fields... */}
        <form.SubscribeButton label="Submit" />
      </form>
    </FormProvider>
  )
}
```

**Field Components** (`components/form-fields.tsx`):
- `ControlledInput` - Text input with validation
- `ControlledTextarea` - Multi-line text input
- `ControlledSelect` - Dropdown select
- `ControlledSwitch` - Toggle switch
- `ControlledArrayField` - Dynamic array of fields (add/remove items)

### Schema Patterns

Schemas use Zod for validation and serve as the single source of truth for both frontend and backend.

**Schema Organization**:
```
lib/schemas/
├── settings.ts              # User settings schemas
├── settings.test.ts         # Schema tests
└── cursor/
    ├── launch-agent.ts      # Cursor API launch agent schemas
    └── launch-agent.test.ts # Schema tests
```

**Schema Pattern** (`lib/schemas/cursor/launch-agent.ts`):
```typescript
import { z } from "zod"

// Base API schema (matches Cursor API)
export const launchAgentRequestSchema = z.object({
  prompt: promptSchema,
  source: sourceSchema,
  model: modelSchema,
  target: targetSchema.optional(),
  webhook: webhookSchema.optional(),
})

// Form schema (extends with stricter validation for UI)
export const launchAgentFormSchema = launchAgentRequestSchema.extend({
  prompt: promptSchema.extend({
    text: z.string()
      .min(10, "Please provide a more detailed task description")
      .max(5000, "Task description is too long"),
  }),
  source: sourceSchema.extend({
    repository: z.string().url().refine(...),
    ref: z.string().min(1, "Base branch is required"),
  }),
})

// Type exports
export type LaunchAgentRequest = z.infer<typeof launchAgentRequestSchema>
export type LaunchAgentFormData = z.infer<typeof launchAgentFormSchema>

// Validation functions
export function validateLaunchAgentRequest(data: unknown): LaunchAgentRequest {
  return launchAgentRequestSchema.parse(data)
}

// Conversion functions
export function formDataToApiRequest(formData: LaunchAgentFormData): LaunchAgentRequest {
  // Transform form data to API request format
}
```

**Schema Usage**:
- **API Routes**: Use `zValidator("json", schema)` from `@hono/zod-validator`
- **Forms**: Pass schema to `validators.onSubmit` in `useAppForm`
- **Types**: Infer TypeScript types from schemas

### Test Structure

Tests use **Bun's test runner** with a preload script for mocking.

**Test Organization**:
```
lib/hono/__tests__/
├── preload.ts              # Module mocks (loaded before tests)
├── setup.ts                # Test helpers and state management
└── routes/
    ├── agents.test.ts      # Agent route tests
    ├── models.test.ts      # Models route tests
    ├── user.test.ts        # User route tests
    └── index.test.ts       # Main app tests
```

**Running Tests**:
```bash
# Run all tests
bun test

# Run API tests only
bun test lib/hono

# Watch mode
bun test --watch
```

**Test Patterns** (`lib/hono/__tests__/routes/agents.test.ts`):
```typescript
import { afterEach, describe, expect, it } from "bun:test"
import {
  mockAgent,
  resetMockState,
  withoutApiKey,
  withoutAuthentication,
} from "@/lib/hono/__tests__/setup"
import { agentsApp } from "@/lib/hono/routes/agents"

describe("Agents Routes", () => {
  afterEach(() => {
    resetMockState()
  })

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      withoutAuthentication()
      const res = await agentsApp.request("/")
      expect(res.status).toBe(401)
    })
  })

  describe("GET / (List Agents)", () => {
    it("returns agents in simulation mode", async () => {
      withoutApiKey() // Enables simulation mode
      const res = await agentsApp.request("/")
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.simulation).toBe(true)
    })
  })
})
```

**Test Helpers** (`lib/hono/__tests__/setup.ts`):
- `withoutAuthentication()` - Simulate unauthenticated user
- `withoutApiKey()` - Enable simulation mode (no Cursor API key)
- `withValidApiKey()` - Enable live mode (has Cursor API key)
- `resetMockState()` - Reset all mocks to defaults

**Preload Mocks** (`lib/hono/__tests__/preload.ts`):
- Mocks `@/lib/auth` - Authentication
- Mocks `@/lib/db` - Database queries
- Mocks `@/lib/encryption` - Encryption/decryption
- Mocks `@/lib/mock-data` - Simulation data
- Mocks `ai` and `@ai-sdk/openai` - AI SDK
- Mocks `globalThis.fetch` - Cursor API calls

### React Query Hooks

The app uses TanStack React Query for server state management with custom hooks.

**Hook Organization**:
```
lib/hooks/
├── use-session.ts          # Current user session
├── use-app-form.tsx        # TanStack Form hook
├── use-agents.ts           # Agent CRUD operations
├── use-repositories.ts     # User repositories
├── use-branches.ts         # User branches
├── use-models.ts           # Available AI models
└── use-time-tracking.ts    # Task time tracking
```

**Hook Pattern** (`lib/hooks/use-agents.ts`):
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const AGENTS_QUERY_KEY = ["agents"] as const

// Query hook for listing agents
export function useAgents(page = 0, limit = 20) {
  return useQuery<PaginatedAgentsResponse>({
    queryKey: [...AGENTS_QUERY_KEY, page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/agents?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error("Failed to fetch agents")
      return response.json()
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })
}

// Mutation hook for launching agent
export function useLaunchAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LaunchAgentRequest) => {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to launch agent")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })
}
```

### Authentication & Database

**Authentication System**: The app uses Better Auth with email/password authentication. All user data is stored in a shared Turso SQLite database.

**Authentication Flow**:
1. User registers at `/signup` with email/password
2. Better Auth hashes password with bcrypt and creates user in `user` table
3. Session is created and stored in `session` table
4. Session token stored in HTTP-only cookie
5. Middleware protects all routes except auth pages and API auth endpoints
6. Unauthenticated users are redirected to `/login` with callback URL
7. Authenticated users accessing auth pages are redirected to home

**Database Architecture** (Single shared Turso database):
| Table | Purpose |
|-------|---------|
| `user` | User accounts (id, name, email, emailVerified, timestamps) |
| `session` | Active sessions with expiry tracking |
| `account` | Account credentials (passwords, OAuth tokens) |
| `verification` | Email verification tokens |
| `user_api_keys` | Encrypted Cursor and OpenAI API keys (one per user) |
| `repositories` | User's saved GitHub repositories |
| `branches` | User's saved branch names |
| `user_settings` | User preferences (theme, etc.) |
| `time_logs` | Task time tracking |

All user-specific tables have `userId` foreign keys with cascade delete.

**Security**:
- Passwords: Hashed with bcrypt by Better Auth
- API Keys: Encrypted with AES-256-GCM before storage (`lib/encryption.ts`)
- Sessions: HTTP-only cookies, 7-day expiry with 1-day refresh
- Database: Parameterized queries via Drizzle ORM (SQL injection protection)

**Key Files**:
- `lib/auth.ts` - Better Auth server configuration
- `lib/auth-client.ts` - Client-side auth utilities (signIn, signUp, signOut, useSession)
- `lib/db.ts` - Drizzle database connection to Turso
- `lib/encryption.ts` - AES-256-GCM encryption/decryption for API keys
- `lib/schema/auth-schema.ts` - Better Auth tables + user_api_keys
- `lib/schema/user-schema.ts` - User data tables

### State Management

- **Better Auth Session**: Server-side session management with HTTP-only cookies
  - Sessions stored in `session` table with 7-day expiry
  - Client hook: `useSession()` returns current user, session, loading state
- **React Query** (@tanstack/react-query): Server state, data fetching, caching
  - Auto-refetch intervals: agents list (5min), conversations (5s)
  - Query invalidation on mutations
  - Optimistic updates for immediate UI feedback
- **ThemeProvider** (next-themes): Theme management (dark/light/system)
- **TanStack React Form**: Form state and validation

### API Layer

All API routes are protected by authentication (except `/api/auth/*`). Agent routes support dual mode operation:

**User API Routes** (authenticated):
- `GET /api/user/api-key` - Check if user has API key (returns masked version)
- `POST /api/user/api-key` - Save/update encrypted API key
- `DELETE /api/user/api-key` - Remove API key
- `GET /api/user/openai-api-key` - Check OpenAI API key status
- `POST /api/user/openai-api-key` - Save OpenAI API key
- `DELETE /api/user/openai-api-key` - Remove OpenAI API key
- `GET /api/user/repositories` - Get user's saved repositories
- `POST /api/user/repositories` - Save repositories (replaces all)
- `GET /api/user/branches` - Get user's saved branches
- `POST /api/user/branches` - Save branches (replaces all)
- `GET /api/user/time-logs` - Get time logs (optional taskId filter)
- `POST /api/user/time-logs` - Save a time log

**Agent API Routes** (simulation or live mode based on user's API key):
1. **Simulation Mode** (user has no API key): Returns mock data from `lib/mock-data.ts`
2. **Live Mode** (user has valid API key): Decrypts user's API key and proxies requests to `https://api.cursor.com/v0/agents`

Agent API routes follow REST conventions:
- `GET /api/agents?page=0&limit=20` - Paginated list
- `POST /api/agents` - Launch new agent
- `GET /api/agents/:id` - Agent details
- `GET /api/agents/:id/conversation` - Agent conversation
- `POST /api/agents/:id/followup` - Send follow-up message
- `POST /api/agents/:id/stop` - Stop running agent
- `POST /api/agents/:id/summarize` - Generate conversation summary (requires OpenAI key)
- `DELETE /api/agents/:id` - Delete agent

**Models API Route**:
- `GET /api/models` - List available AI models

All responses include a `simulation: boolean` field indicating the mode.

### UI Architecture

- **Mobile-First Design**: Max-width 448px (max-w-md), centered layout
- **Responsive**: Desktop layout with header navigation, mobile with bottom nav
- **Component Library**: Radix UI primitives + custom Tailwind components
- **Styling**: Tailwind CSS 4 with CSS variables for theming
- **Icons**: Lucide React

**Component Organization**:
```
components/
├── ui/                      # Radix UI primitive wrappers
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── ...
├── forms/                   # Form components
│   └── launch-agent-form.tsx
├── form-fields.tsx          # Controlled field components
├── subscribe-button.tsx     # Form submit button
├── agent-list.tsx           # Agent list view
├── agent-card.tsx           # Individual agent card
├── agent-detail.tsx         # Agent detail view
├── settings-form.tsx        # Settings form
├── api-key-manager.tsx      # Cursor API key management
├── openai-api-key-manager.tsx # OpenAI API key management
├── account-screen.tsx       # Account page content
├── login-form.tsx           # Login form
├── signup-form.tsx          # Signup form
├── simulation-banner.tsx    # Simulation mode indicator
└── providers.tsx            # App providers (QueryClient, Theme)
```

### Type System

Core types in `lib/types.ts`:

- `Agent`: Core agent data structure with status (RUNNING/FINISHED/ERROR/CREATING/EXPIRED)
- `AgentMessage`: Conversation messages (user_message/assistant_message/tool_call/tool_result)
- `AgentConversation`: Full conversation thread
- `LaunchAgentRequest`: Payload for creating new agents
- `PaginatedAgentsResponse`: Paginated agent list response

### Environment Configuration

Create a `.env.local` file for environment variables:

```bash
# Turso Database (Auth DB - Shared)
TURSO_AUTH_DATABASE_URL=libsql://your-auth-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Turso API (for database management)
TURSO_ORG_NAME=your-org-name
TURSO_API_TOKEN=your-turso-api-token

# Better Auth
BETTER_AUTH_SECRET=your-random-secret-min-32-chars
ENCRYPTION_SECRET=your-encryption-secret-min-32-chars

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Your Cursor API key (can also be set per-user in the app)
CURSOR_API_KEY=your-cursor-api-key
```

**Simulation Mode**: The app automatically enters simulation mode (using mock data) when a user doesn't have a valid API key configured. Mode detection happens via the `withSimulationMode` Hono middleware which:
1. Checks the user's session from the request headers
2. Queries the `user_api_keys` table for their encrypted API key
3. Sets `simulationMode: true` if no API key exists or if it's invalid
4. Sets `simulationMode: false` and `apiKey` if a valid key exists

## Important Configuration

- **TypeScript**: `ignoreBuildErrors: true` in `next.config.mjs` (consider fixing and removing)
- **Images**: `unoptimized: true` in `next.config.mjs`
- **Fonts**: Inter (sans) and JetBrains Mono (mono) from Google Fonts
- **PWA**: Configured with manifest and apple-web-app meta tags
- **Theme**: Defaults to dark mode, uses localStorage with SSR-safe inline script

## Key Implementation Details

### Path Aliases

`@/*` resolves to project root (configured in `tsconfig.json`)

### Preventing Flash of Unstyled Content

The root layout (`app/layout.tsx`) includes an inline script that applies the dark class before React hydration to prevent theme flash.

### Form Handling

Forms use TanStack React Form with Zod validation. The `useAppForm` hook provides:
- Pre-configured field components (`ControlledInput`, `ControlledTextarea`, etc.)
- Form context provider (`FormProvider`)
- Submit button with loading state (`SubscribeButton`)

### Optimistic Updates

Agent operations use React Query's mutation callbacks to invalidate queries and trigger refetch for immediate UI feedback.

### Database Migrations

Use Drizzle Kit for database migrations:
```bash
# Generate migrations from schema changes
bun run db:generate

# Push migrations to database
bun run db:push

# Open database GUI
bun run db:studio
```
