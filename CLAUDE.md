# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Lint
bun run lint
```

## Environment Configuration

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

**Simulation Mode**: The app automatically enters simulation mode (using mock data) when a user doesn't have a valid API key configured in their account. Mode detection happens in `lib/api-utils.ts:isSimulationMode()` which:
1. Checks the user's session from the request headers
2. Queries the `user_api_keys` table for their encrypted API key
3. Returns `true` if no API key exists or if it's invalid (< 10 chars, contains placeholders)
4. Returns `false` if a valid API key exists (enabling live mode)

## Architecture

### Authentication & Database

**Authentication System**: The app uses Better Auth with email/password authentication. All user data is stored in a shared Turso SQLite database.

**Authentication Flow**:
1. User registers at `/signup` with email/password
2. Better Auth hashes password with bcrypt and creates user in `user` table
3. Session is created and stored in `session` table
4. Session token stored in HTTP-only cookie
5. Middleware (`middleware.ts`) protects all routes except `/login`, `/signup`, and `/api/auth/*`
6. Unauthenticated users are redirected to `/login` with callback URL
7. Authenticated users accessing auth pages are redirected to home

**Database Architecture**:

The app uses a **single shared Turso database** for all users:
- `user` - User accounts (id, name, email, emailVerified, timestamps)
- `session` - Active sessions with expiry tracking
- `account` - Account credentials (passwords, OAuth tokens if added)
- `verification` - Email verification tokens
- `user_api_keys` - Encrypted Cursor API keys (one per user, `userId` foreign key)
- `repositories` - User's saved GitHub repositories (`userId` foreign key)
- `branches` - User's saved branch names (`userId` foreign key)
- `user_settings` - User preferences like theme (`userId` foreign key)

All user-specific tables have `userId` foreign keys with cascade delete.

**Security**:
- Passwords: Hashed with bcrypt by Better Auth
- API Keys: Encrypted with AES-256-GCM before storage using `lib/encryption.ts`
- Sessions: HTTP-only cookies, 7-day expiry with 1-day refresh
- Database: Parameterized queries via Drizzle ORM (SQL injection protection)
- Middleware: Route protection, session validation on every request

**Key Files**:
- `lib/auth.ts` - Better Auth server configuration
- `lib/auth-client.ts` - Client-side auth utilities (signIn, signUp, signOut, useSession)
- `lib/db.ts` - Drizzle database connection to Turso
- `lib/encryption.ts` - AES-256-GCM encryption/decryption for API keys
- `lib/schema/auth-schema.ts` - Better Auth tables + user_api_keys
- `lib/schema/user-schema.ts` - User data tables (repositories, branches, settings)
- `lib/hooks/use-session.ts` - React hook for accessing current user session
- `middleware.ts` - Route protection middleware
- `app/api/auth/[...all]/route.ts` - Better Auth API endpoints
- `app/login/page.tsx` - Login form
- `app/signup/page.tsx` - Registration form

### App Structure (Next.js App Router)

```
app/
├── page.tsx                  # Home: agent list view
├── login/page.tsx            # Login page
├── signup/page.tsx           # Signup page
├── new/page.tsx              # Launch new agent form
├── agent/[id]/page.tsx       # Agent detail/conversation view
├── settings/page.tsx         # Settings page
├── account/page.tsx          # Account page
├── layout.tsx                # Root layout with providers
└── api/                      # API routes (Next.js Route Handlers)
    ├── auth/[...all]/        # Better Auth endpoints (GET, POST)
    ├── user/                 # User data endpoints (authenticated)
    │   ├── api-key/          # GET (status), POST (save), DELETE
    │   ├── repositories/     # GET (list), POST (save all)
    │   └── branches/         # GET (list), POST (save all)
    └── agents/               # Agent operations (simulation or live mode)
        ├── route.ts          # GET (list), POST (launch)
        └── [id]/
            ├── route.ts      # GET (details), DELETE
            ├── conversation/route.ts  # GET conversation
            ├── followup/route.ts      # POST follow-up message
            └── stop/route.ts          # POST stop agent
```

### Key Directories

- `components/`: React components (UI components in `components/ui/`)
  - `components/api-key-manager.tsx`: API key management UI component
  - `components/account-screen.tsx`: Account page with user info and API key management
  - `components/settings-form.tsx`: Settings form for repositories and branches
- `lib/`: Utilities, types, and custom hooks
  - `lib/auth.ts`: Better Auth server configuration
  - `lib/auth-client.ts`: Client-side auth utilities
  - `lib/db.ts`: Drizzle database connection
  - `lib/encryption.ts`: AES-256-GCM encryption for API keys
  - `lib/types.ts`: TypeScript types for Agent, AgentMessage, etc.
  - `lib/api-utils.ts`: API configuration, simulation mode detection, user API key retrieval
  - `lib/mock-data.ts`: Simulated data for development/demo
  - `lib/schema/`: Database schemas
    - `auth-schema.ts`: Better Auth tables + user_api_keys
    - `user-schema.ts`: User data tables (repositories, branches, settings)
  - `lib/hooks/`: React Query hooks
    - `use-session.ts`: Current user session hook
    - `use-agents.ts`: Agent operations (list, launch, stop, delete)
    - `use-repositories.ts`: User repositories (fetch from DB, save to DB)
    - `use-branches.ts`: User branches (fetch from DB, save to DB)
- `hooks/`: General React hooks
- `public/`: Static assets
- `styles/`: Global styles
- `drizzle/`: Database migrations
- `middleware.ts`: Next.js middleware for route protection

### State Management

- **Better Auth Session**: Server-side session management with HTTP-only cookies
  - Sessions stored in `session` table with 7-day expiry
  - Client hook: `useSession()` returns current user, session, loading state
- **React Query** (@tanstack/react-query): Server state, data fetching, caching
  - Agent operations: `lib/hooks/use-agents.ts` (list, launch, stop, delete, followup)
  - User data: `lib/hooks/use-repositories.ts`, `lib/hooks/use-branches.ts`
  - Auto-refetch intervals: agents list (10s), conversations (5s), user data (5min stale time)
  - Query invalidation on mutations (launch, stop, delete, follow-up, save repos/branches)
  - Optimistic updates for immediate UI feedback
- **ThemeProvider** (next-themes): Theme management (dark/light/system)
- **TanStack React Form**: Form state and validation (login, signup, settings)

### API Layer

All API routes are protected by authentication (except `/api/auth/*`). Agent routes support dual mode operation:

**User API Routes** (authenticated):
- `GET /api/user/api-key` - Check if user has API key (returns masked version)
- `POST /api/user/api-key` - Save/update encrypted API key
- `DELETE /api/user/api-key` - Remove API key
- `GET /api/user/repositories` - Get user's saved repositories
- `POST /api/user/repositories` - Save repositories (replaces all)
- `GET /api/user/branches` - Get user's saved branches
- `POST /api/user/branches` - Save branches (replaces all)

**Agent API Routes** (simulation or live mode based on user's API key):
1. **Simulation Mode** (user has no API key): Returns mock data from `lib/mock-data.ts` with 2s delays
2. **Live Mode** (user has valid API key): Decrypts user's API key and proxies requests to `https://api.cursor.com/v0/agents`

Agent API routes follow REST conventions:
- `GET /api/agents?page=0&limit=20` - Paginated list
- `POST /api/agents` - Launch new agent
- `GET /api/agents/[id]` - Agent details
- `GET /api/agents/[id]/conversation` - Agent conversation
- `POST /api/agents/[id]/followup` - Send follow-up message
- `POST /api/agents/[id]/stop` - Stop running agent
- `DELETE /api/agents/[id]` - Delete agent

All agent responses include a `simulation: boolean` field indicating the mode.

**Mode Detection**: Each agent API route calls `isSimulationMode(request)` which:
1. Extracts session from request headers using `auth.api.getSession()`
2. If no session, returns `true` (simulation mode)
3. Queries `user_api_keys` table for user's encrypted API key
4. Decrypts the API key if found
5. Returns `true` if no key, invalid key, or key too short; otherwise `false` (live mode)

### UI Architecture

- **Mobile-First Design**: Max-width 448px (max-w-md), centered layout
- **MobileShell** component: Provides consistent layout with bottom navigation
- **Bottom Navigation**: 4-tab navigation (Agents, New, Settings, Account)
- **Component Library**: Radix UI primitives + custom Tailwind components
- **Styling**: Tailwind CSS 4 with CSS variables for theming
- **Icons**: Lucide React + Hugeicons

### Type System

Core types in `lib/types.ts`:

- `Agent`: Core agent data structure with status (RUNNING/FINISHED/ERROR/CREATING/EXPIRED)
- `AgentMessage`: Conversation messages (user_message/assistant_message/tool_call/tool_result)
- `AgentConversation`: Full conversation thread
- `LaunchAgentRequest`: Payload for creating new agents
- `PaginatedAgentsResponse`: Paginated agent list response

### Data Flow

**Authentication Flow**:
1. User visits protected route
2. Middleware checks for valid session via `auth.api.getSession()`
3. If no session, redirect to `/login?callbackUrl=<original-path>`
4. User submits login/signup form
5. Better Auth validates credentials and creates session
6. Session token stored in HTTP-only cookie
7. User redirected to original path (or home)

**Agent Operation Flow** (e.g., launching an agent):
1. User interacts with UI component (e.g., clicks "Launch Agent")
2. Component calls React Query hook (e.g., `useLaunchAgent()`)
3. Hook makes authenticated fetch request to Next.js API route (`POST /api/agents`)
4. API route extracts session from request headers
5. API route calls `isSimulationMode(request)` to check user's API key
6. If simulation mode: Returns mock data from `lib/mock-data.ts`
7. If live mode: Decrypts user's API key, proxies request to Cursor API
8. React Query updates cache and triggers re-renders
9. UI reflects new state with agent status

**User Data Flow** (e.g., saving repositories):
1. User edits repositories in Settings form
2. User clicks "Save Settings"
3. Form calls `saveRepositories(repos)` from `useRepositories()` hook
4. Hook makes authenticated `POST /api/user/repositories` request
5. API route extracts session, gets `userId`
6. API route deletes old repositories, inserts new ones (all with `userId`)
7. React Query updates cache with new data
8. UI reflects saved repositories immediately

## Important Configuration

- **TypeScript**: `ignoreBuildErrors: true` in `next.config.mjs` (consider fixing and removing)
- **Images**: `unoptimized: true` in `next.config.mjs`
- **Fonts**: Inter (sans) and JetBrains Mono (mono) from Google Fonts
- **PWA**: Configured with manifest and apple-web-app meta tags
- **Theme**: Defaults to dark mode, uses localStorage with SSR-safe inline script

## Key Implementation Details

### Preventing Flash of Unstyled Content

The root layout (`app/layout.tsx`) includes an inline script that applies the dark class before React hydration to prevent theme flash.

### Path Aliases

`@/*` resolves to project root (configured in `tsconfig.json`)

### Form Handling

Forms use TanStack React Form with Zod validation. Example: `components/launch-agent-form.tsx`

### Optimistic Updates

Agent operations use React Query's mutation callbacks to invalidate queries and trigger refetch for immediate UI feedback.
