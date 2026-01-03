# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For comprehensive documentation, see [AGENTS.md](./AGENTS.md) which contains the full technical reference.

## Project Overview

Cursor Agent Manager is a mobile-first Next.js 16 (App Router) application for managing Cursor background agents on the go. The app uses React 19, TypeScript, Tailwind CSS 4, and operates in either simulation mode (with mock data) or live mode (connected to the Cursor API).

## Development Commands

**Package Manager**: This project uses **Bun** (not npm/pnpm/yarn).

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Production build
bun run build

# Lint - USE THIS to check for errors
bun run lint

# Format code with Biome (CRITICAL - run before committing)
bun run lint:fix

# Run tests
bun test

# Run API tests
bun test lib/hono
```

## Code Formatting (CRITICAL)

**CRITICAL**: Before pushing any code changes, you **MUST** run:

```bash
bun run lint:fix
```

**⚠️ MANDATORY RULES**:
1. **ALWAYS** run `bun run lint:fix` after making code changes and BEFORE pushing
2. **NEVER** push code that has linting errors - the GitHub Action will fail and block merging
3. **ALWAYS** verify with `bun run lint` that no errors remain before pushing

**Rule**: **ALWAYS** run `bun run lint:fix` before pushing code. This is mandatory. The GitHub Actions will automatically fail workflows with linting errors, so you must fix all issues first.

## Testing & Validation

**DO**: Use `bun run lint` to check for errors and validate code

**DON'T**: Run `bun run dev` to check for errors - it interferes with running dev servers

## Architecture Overview

### Route Groups

```
app/
├── (authenticated)/     # Pages requiring login (layout with nav)
├── (unauthenticated)/   # Public auth pages (login, signup)
├── (server)/api/        # API routes (Hono + Better Auth)
└── layout.tsx           # Root layout
```

### Hono API

Routes are in `lib/hono/`:
- `index.ts` - Main app combining all routes
- `middleware/` - auth.ts, simulation.ts, error-handler.ts
- `routes/` - agents.ts, user.ts, models.ts
- `__tests__/` - API tests with Bun test runner

### TanStack Form

Forms use `useAppForm` hook from `lib/hooks/use-app-form.tsx` with:
- Field components: `ControlledInput`, `ControlledTextarea`, `ControlledSelect`, `ControlledSwitch`
- Zod validation via `validators.onSubmit`
- `FormProvider` wrapper

### Schemas

Zod schemas in `lib/schemas/`:
- Base API schemas + extended form schemas with stricter validation
- Used in both API routes (`zValidator`) and forms

### Key Directories

- `lib/hono/` - Hono API routes and middleware
- `lib/hooks/` - React Query and form hooks
- `lib/schemas/` - Zod validation schemas
- `components/` - React components (UI in `components/ui/`)
- `components/forms/` - Form components

## Environment Configuration

```bash
# Turso Database
TURSO_AUTH_DATABASE_URL=libsql://your-auth-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Better Auth
BETTER_AUTH_SECRET=your-random-secret-min-32-chars
ENCRYPTION_SECRET=your-encryption-secret-min-32-chars

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Key Patterns

### API Routes (Hono)

```typescript
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAuth } from "@/lib/hono/middleware/auth"
import { withSimulationMode } from "@/lib/hono/middleware/simulation"

const app = new Hono<{ Variables: AuthVariables & SimulationVariables }>()
app.use("*", requireAuth)
app.use("*", withSimulationMode)

app.get("/", zValidator("query", schema), async (c) => {
  const simulationMode = c.get("simulationMode")
  // ...
})
```

### Forms

```typescript
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { myFormSchema } from "@/lib/schemas/my-schema"

const form = useAppForm({
  defaultValues: { ... },
  validators: { onSubmit: myFormSchema },
  onSubmit: async ({ value }) => { ... },
})

return (
  <FormProvider value={form}>
    <form.AppField name="fieldName">
      {(field) => <field.ControlledInput field={field} label="Label" />}
    </form.AppField>
  </FormProvider>
)
```

### React Query Hooks

```typescript
export function useMyData() {
  return useQuery({
    queryKey: ["myData"],
    queryFn: async () => {
      const res = await fetch("/api/my-data")
      return res.json()
    },
  })
}

export function useMyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => { ... },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myData"] }),
  })
}
```

## Database

Use Drizzle Kit for migrations:
```bash
bun run db:generate  # Generate migrations
bun run db:push      # Push to database
bun run db:studio    # Open database GUI
```

## Path Aliases

`@/*` resolves to project root (configured in `tsconfig.json`)
