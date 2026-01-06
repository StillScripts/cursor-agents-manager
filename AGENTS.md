# Project Overview

Cursor Agent Manager is a web app with Progressive Web App (PWA) support. It is powered by Bun, Next.js 16 (with modern features like `cacheComponents` and the `proxy.ts` file which replaces `middleware.ts`), React 19, Biome, Better Auth, Convex, TailwindCSS and Base UI. It's purpose is to enable developers to manage their managing Cursor AI background agents on the go, particularly on their mobile phone as a PWA. The app provides a simulation mode (with mock data) for people to trial, or live mode (connected to the Cursor API).

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
bun run test

# Watch mode for tests
bun run test --watch
```

## Code Formatting (CRITICAL)

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

**DO**: Use `bun run test` to run the rapid unit testing suite, powered by `bun`. And use `bun run lint` to lint files, powered by `biome`.
- Fast and safe,
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
│   ├── _components/              # Route-group-level shared components
│   │   ├── agent-card.tsx        # Agent card for list view
│   │   ├── agent-list-skeleton.tsx
│   │   ├── agents-table.tsx      # Agent list table
│   │   ├── bottom-nav.tsx        # Mobile bottom navigation
│   │   ├── desktop-header.tsx    # Desktop header navigation
│   │   ├── nav-items.ts          # Shared navigation items config
│   │   ├── page-header.tsx       # Reusable page header
│   │   ├── simulation-banner.tsx # Simulation mode indicator
│   │   └── status-badge.tsx      # Agent status badge
│   ├── page.tsx                  # Home: agent list view
│   ├── new/page.tsx              # Launch new agent form
│   ├── agent/[id]/
│   │   ├── page.tsx              # Agent detail/conversation view
│   │   └── _components/          # Agent-specific components
│   │       └── agent-detail.tsx  # Agent detail view
│   ├── settings/page.tsx         # Settings page
│   └── account/
│       ├── page.tsx              # Account page
│       └── _components/          # Account-specific components
│           ├── activity-screen.tsx
│           ├── api-key-manager.tsx
│           └── openai-api-key-manager.tsx
│
├── (unauthenticated)/            # Public pages (no auth required)
│   ├── login/page.tsx            # Login page
│   └── signup/page.tsx           # Signup page
│
├── (server)/                     # API routes (server-only)
│   └── api/
│       └── auth/[...all]/route.ts   # Better Auth endpoints
│
└── layout.tsx                    # Root layout with providers
```

**Key Concepts**:
- `(authenticated)` - Pages wrapped with auth layout containing navigation
- `(unauthenticated)` - Standalone auth pages without app navigation
- `(server)` - API routes (server-only)
- `_components/` - Private folder (underscore prefix) not treated as routes

### The `_components` Pattern

We use underscore-prefixed `_components` folders to colocate components with their route segments. This keeps route-specific logic close to where it's used while preventing Next.js from treating them as routes.

**When to use `_components`**:
- Components used only within a specific route segment or its children
- Components tightly coupled to route-specific data or logic
- Page sections that don't need to be shared across the app

**Hierarchy**:
```
app/(authenticated)/
├── _components/              # Shared across all authenticated pages
│   └── nav-items.ts          # Used by bottom-nav and desktop-header
├── agent/[id]/
│   └── _components/          # Only used by agent detail page
│       └── agent-detail.tsx
└── account/
    └── _components/          # Only used by account pages
        └── api-key-manager.tsx
```

**Rule**: If a component is only used within one route segment (and its children), place it in that segment's `_components` folder. If it's shared across multiple route groups or the entire app, place it in the root `/components` folder.


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
- **API Routes**: Use Zod schemas for request validation
- **Forms**: Pass schema to `validators.onSubmit` in `useAppForm`
- **Types**: Infer TypeScript types from schemas

### Test Structure

The project uses **Vitest** for testing with **convex-test** for Convex function testing. Tests are organized in `convex/__tests__/` and follow a consistent structure and naming convention.

**Running Tests**:
```bash
# Run all tests
bun run test

# Watch mode
bun test --watch

# Run specific test file
bun test convex/_tests/branches.test.ts
```

**Test Organization**:
```
convex/_tests/
├── testHelpers.ts           # Shared test utilities and helpers
├── branches.test.ts         # Tests for branches Convex functions
├── repositories.test.ts     # Tests for repositories Convex functions
└── timeLogs.test.ts        # Tests for timeLogs Convex functions
```

**Test Structure Convention**:

Tests follow a hierarchical structure using nested `describe` blocks:

```typescript
describe("modelName", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("functionName", () => {
    it("describes the specific behavior", async () => {
      // Test implementation
    })
  })
})
```

**Structure Pattern**:
1. **Outer `describe`**: Model/domain name (e.g., `"branches"`, `"repositories"`, `"timeLogs"`)
2. **Inner `describe`**: Specific function name (e.g., `"getBranches"`, `"saveBranches"`)
3. **`it` blocks**: Individual test cases with descriptive names

**Example**:
```typescript
describe("branches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getBranches", () => {
    it("returns empty array when not authenticated", async () => {
      // Test implementation
    })

    it("returns empty array when authenticated but no branches exist", async () => {
      // Test implementation
    })
  })

  describe("saveBranches", () => {
    it("saves branches for authenticated user", async () => {
      // Test implementation
    })
  })

  describe("multi-user isolation", () => {
    it("isolates branches per user", async () => {
      // Test implementation
    })
  })
})
```

**Test Helpers** (`convex/_tests/testHelpers.ts`):

The test helpers provide utilities for creating test instances with mocked authentication:

- `createTestInstance()` - Creates a base test instance with authentication mocked
- `createTestWithUser(identity?)` - Creates a test instance with a specific user identity
- `createTestUsers(identities?)` - Creates multiple test instances for multi-user scenarios

**Common Test Patterns**:

1. **Authentication Tests**:
   ```typescript
   it("returns empty array when not authenticated", async () => {
     const t = createTestInstance()
     const result = await t.query(api.model.function)
     expect(result).toEqual([])
   })
   ```

2. **Empty State Tests**:
   ```typescript
   it("returns empty array when authenticated but no data exists", async () => {
     const asUser = createTestWithUser()
     const result = await asUser.query(api.model.function)
     expect(result).toEqual([])
   })
   ```

3. **Mutation Tests**:
   ```typescript
   it("saves data for authenticated user", async () => {
     const asUser = createTestWithUser()
     const result = await asUser.mutation(api.model.saveFunction, { data })
     expect(result).toMatchObject(data)
   })
   ```

4. **Validation Tests**:
   ```typescript
   it("returns validation error for invalid payload", async () => {
     const asUser = createTestWithUser()
     await expect(
       asUser.mutation(api.model.function, { invalid: "data" } as any)
     ).rejects.toThrow()
   })
   ```

5. **Multi-User Isolation Tests**:
   ```typescript
   describe("multi-user isolation", () => {
     it("isolates data per user", async () => {
       const [asUser1, asUser2] = createTestUsers([
         { name: "User 1" },
         { name: "User 2" },
       ])
       // Test that each user only sees their own data
     })
   })
   ```

**Test File Naming**:
- Test files use the pattern: `{model}.test.ts`
- Located in `convex/__tests__/` directory
- Example: `branches.test.ts`, `repositories.test.ts`, `timeLogs.test.ts`

**Key Testing Principles**:
- Use `it` instead of `test` for consistency
- Group related tests with `describe` blocks
- Test authentication, empty states, mutations, validation, and multi-user isolation
- Use `beforeEach` to clear mocks between tests
- Use descriptive test names that explain the expected behavior
- Test both success and error cases

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

**Authentication System**: The app uses Better Auth with email/password authentication. All user data is stored in a shared database.

**Authentication Flow**:
1. User registers at `/signup` with email/password
2. Better Auth hashes password with bcrypt and creates user in `user` table
3. Session is created and stored in `session` table
4. Session token stored in HTTP-only cookie
5. Middleware protects all routes except auth pages and API auth endpoints
6. Unauthenticated users are redirected to `/login` with callback URL
7. Authenticated users accessing auth pages are redirected to home

**Database Architecture**:
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
- Database: Parameterized queries for SQL injection protection

**Key Files**:
- `lib/auth.ts` - Better Auth server configuration
- `lib/auth-client.ts` - Client-side auth utilities (signIn, signUp, signOut, useSession)
- `lib/db.ts` - Database connection
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

### `/components` Folder Structure

The root `/components` folder contains shared, reusable components used across multiple route groups.

```
components/
├── ui/                      # Base UI primitives (Radix wrappers)
│   ├── accordion.tsx
│   ├── alert-dialog.tsx
│   ├── alert.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── field.tsx            # Field wrapper with label/description/error
│   ├── image-upload.tsx     # Image upload component
│   ├── input-group.tsx      # Input with prefix/suffix
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── sidebar.tsx
│   ├── skeleton.tsx
│   ├── skeleton-card.tsx
│   ├── spinner.tsx
│   ├── switch.tsx
│   ├── textarea.tsx
│   ├── toast.tsx
│   ├── toggle.tsx
│   ├── toggle-group.tsx
│   └── tooltip.tsx
│
├── forms/                   # Full form components
│   ├── core/                # Form building blocks
│   │   ├── form-fields.tsx  # Controlled field components (ControlledInput, etc.)
│   │   └── subscribe-button.tsx # Form submit button with loading state
│   ├── launch-agent-form.tsx
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   └── settings-form.tsx
│
├── ai/                      # AI-related components
│   ├── audio-recorder.tsx   # Voice recording component
│   └── textarea-with-voice.tsx # Textarea with voice input
│
├── providers.tsx            # App-wide providers (QueryClient, Theme)
├── theme-provider.tsx       # next-themes provider
├── pwa-installer.tsx        # PWA install prompt
└── pwa-register.tsx         # Service worker registration
```

**Organization Rules**:
- `ui/` - Primitive components with no business logic (buttons, inputs, etc.)
- `forms/` - Complete form components and form building blocks
- `forms/core/` - Reusable form field components used by TanStack Form
- `ai/` - AI-specific UI components (voice input, etc.)
- Root level - App-wide utilities (providers, PWA components)

### `/lib` Folder Structure

The `/lib` folder contains all business logic, utilities, hooks, and server-side code.

```
lib/
├── hooks/                   # React hooks
│   ├── use-app-form.tsx     # TanStack Form hook configuration
│   ├── use-agents.ts        # Agent CRUD operations (React Query)
│   ├── use-ai.ts            # AI/voice hooks
│   ├── use-branches.ts      # User branches
│   ├── use-models.ts        # Available AI models
│   ├── use-repositories.ts  # User repositories
│   ├── use-session.ts       # Auth session hook
│   └── use-time-tracking.ts # Task time tracking
│
├── schemas/                 # Zod validation schemas
│   ├── cursor/              # Cursor API schemas
│   │   ├── launch-agent.ts  # Launch agent request/form schemas
│   │   ├── launch-agent.test.ts
│   │   ├── webhook.ts       # Webhook payload schemas
│   │   └── webhook.test.ts
│   ├── settings.ts          # User settings schemas
│   ├── settings.test.ts
│   ├── auth.ts              # Auth-related schemas
│   ├── auth.test.ts
│   └── ai.ts                # AI-related schemas
│
├── db/                      # Database layer
│   ├── index.ts             # Database client
│   ├── schema/              # Database schemas
│   │   ├── auth-schema.ts   # Better Auth tables + user_api_keys
│   │   └── user-schema.ts   # User data tables
│   ├── encryption.ts        # AES-256-GCM encryption
│   └── user-db.ts           # User data queries
│
├── better-auth/             # Better Auth configuration
├── server/                  # Server-only utilities
├── cache/                   # Caching utilities
│
├── api-utils.ts             # API helper functions
├── conversation-utils.ts    # Conversation formatting
├── formatting.ts            # Date/number formatting
├── formatting.test.ts
├── mock-data.ts             # Simulation mode mock data
├── types.ts                 # Core TypeScript types
├── utils.ts                 # General utilities (cn, etc.)
└── utils.test.ts
```

**Organization Rules**:
- `hooks/` - All React hooks (data fetching, forms, utilities)
- `schemas/` - Zod schemas organized by domain (cursor/, settings, auth)
- `db/` - Database connection, schemas, and encryption
- Root level - Standalone utilities and types

### UI Architecture

- **Mobile-First Design**: Max-width 448px (max-w-md), centered layout
- **Responsive**: Desktop layout with header navigation, mobile with bottom nav
- **Component Library**: Radix UI primitives + custom Tailwind components
- **Styling**: Tailwind CSS 4 with CSS variables for theming
- **Icons**: Lucide React

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
# Better Auth
BETTER_AUTH_SECRET=your-random-secret-min-32-chars
ENCRYPTION_SECRET=your-encryption-secret-min-32-chars

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Your Cursor API key (can also be set per-user in the app)
CURSOR_API_KEY=your-cursor-api-key

# Cursor Webhook Configuration (optional, but recommended)
CURSOR_WEBHOOK_URL=https://your-app.com/api/webhooks/cursor
CURSOR_WEBHOOK_SECRET=your-webhook-secret-min-32-chars
```

**Simulation Mode**: The app automatically enters simulation mode (using mock data) when a user doesn't have a valid API key configured. Mode detection happens by:
1. Checking the user's session from the request headers
2. Querying the `user_api_keys` table for their encrypted API key
3. Setting `simulationMode: true` if no API key exists or if it's invalid
4. Setting `simulationMode: false` and `apiKey` if a valid key exists

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

