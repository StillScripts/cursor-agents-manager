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
# Optional: Cursor API key for live mode
CURSOR_API_KEY=your-api-key-here
```

**Simulation Mode**: The app automatically enters simulation mode (using mock data) when:
- `CURSOR_API_KEY` is missing
- `CURSOR_API_KEY` is empty or contains placeholder text like "undefined", "your-api-key", or "placeholder"
- `CURSOR_API_KEY` is shorter than 10 characters

See `lib/api-utils.ts:isSimulationMode()` for the exact logic.

## Architecture

### App Structure (Next.js App Router)

```
app/
├── page.tsx                  # Home: agent list view
├── new/page.tsx              # Launch new agent form
├── agent/[id]/page.tsx       # Agent detail/conversation view
├── settings/page.tsx         # Settings page
├── account/page.tsx          # Account page
├── layout.tsx                # Root layout with providers
└── api/                      # API routes (Next.js Route Handlers)
    └── agents/
        ├── route.ts          # GET (list), POST (launch)
        └── [id]/
            ├── route.ts      # GET (details), DELETE
            ├── conversation/route.ts  # GET conversation
            ├── followup/route.ts      # POST follow-up message
            └── stop/route.ts          # POST stop agent
```

### Key Directories

- `components/`: React components (UI components in `components/ui/`)
- `lib/`: Utilities, types, and custom hooks
  - `lib/types.ts`: TypeScript types for Agent, AgentMessage, etc.
  - `lib/api-utils.ts`: API configuration and simulation mode detection
  - `lib/mock-data.ts`: Simulated data for development/demo
  - `lib/hooks/`: React Query hooks (`use-agents.ts`, `use-repositories.ts`, `use-branches.ts`)
- `hooks/`: General React hooks
- `public/`: Static assets
- `styles/`: Global styles

### State Management

- **React Query** (@tanstack/react-query): Server state, data fetching, caching
  - All agent operations use custom hooks in `lib/hooks/use-agents.ts`
  - Auto-refetch intervals: agents list (10s), conversations (5s)
  - Query invalidation on mutations (launch, stop, delete, follow-up)
- **ThemeProvider** (next-themes): Theme management (dark/light/system)
- **React Hook Form** + **Zod**: Form validation

### API Layer

All API routes support dual mode operation:

1. **Simulation Mode** (no API key): Returns mock data from `lib/mock-data.ts` with 2s delays
2. **Live Mode** (valid API key): Proxies requests to `https://api.cursor.com/v0/agents`

API routes follow REST conventions:
- `GET /api/agents?page=0&limit=20` - Paginated list
- `POST /api/agents` - Launch new agent
- `GET /api/agents/[id]` - Agent details
- `GET /api/agents/[id]/conversation` - Agent conversation
- `POST /api/agents/[id]/followup` - Send follow-up message
- `POST /api/agents/[id]/stop` - Stop running agent
- `DELETE /api/agents/[id]` - Delete agent

All responses include a `simulation: boolean` field indicating the mode.

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

1. User interacts with UI component
2. Component calls React Query hook (e.g., `useLaunchAgent()`)
3. Hook makes fetch request to Next.js API route
4. API route checks `isSimulationMode()`
5. Returns either mock data or proxies to Cursor API
6. React Query updates cache and triggers re-renders
7. UI reflects new state

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
