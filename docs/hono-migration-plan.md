# Hono API Migration Plan

## Overview

This document outlines the plan to migrate from Next.js Route Handlers to Hono while keeping the Next.js app as the main framework. Hono will be mounted as a catch-all route handler under `/api/[...route]`.

## Goals

1. **Cleaner code organization** - Modular route files grouped by domain
2. **Type-safe validation** - Built-in Zod integration with `@hono/zod-validator`
3. **Better middleware composition** - Authentication, error handling, logging
4. **Improved developer experience** - Chainable routes, typed context, OpenAPI support (future)
5. **Preserve all existing functionality** - Zero breaking changes for the frontend

## Current API Structure

```
app/api/
├── auth/[...all]/route.ts    # Better Auth (special - keep separate)
├── agents/
│   ├── route.ts              # GET (list), POST (launch)
│   └── [id]/
│       ├── route.ts          # GET (details), DELETE
│       ├── conversation/route.ts   # GET
│       ├── followup/route.ts       # POST
│       └── stop/route.ts           # POST
├── user/
│   ├── api-key/route.ts      # GET, POST, DELETE
│   ├── repositories/route.ts # GET, POST
│   └── branches/route.ts     # GET, POST
└── models/route.ts           # GET
```

## Proposed Hono Structure

```
lib/
├── api/
│   ├── index.ts              # Main Hono app - combines all sub-apps
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── error-handler.ts  # Global error handling
│   │   └── simulation.ts     # Simulation mode detection middleware
│   ├── routes/
│   │   ├── agents.ts         # /agents routes
│   │   ├── user.ts           # /user routes (api-key, repositories, branches)
│   │   └── models.ts         # /models routes
│   └── utils/
│       └── cursor-api.ts     # Cursor API client wrapper
app/api/
├── auth/[...all]/route.ts    # Keep Better Auth separate (uses toNextJsHandler)
└── [...route]/route.ts       # Hono catch-all handler
```

## Dependencies to Add

```bash
bun add hono @hono/zod-validator
```

## Architecture Details

### 1. Main Hono App (`lib/api/index.ts`)

The main app combines all sub-apps and applies global middleware:

```typescript
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { agentsApp } from "./routes/agents"
import { userApp } from "./routes/user"
import { modelsApp } from "./routes/models"
import { errorHandler } from "./middleware/error-handler"

// Base path will be /api when mounted in Next.js
const app = new Hono().basePath("/api")

// Global middleware
app.use("*", logger())
app.use("*", errorHandler())

// Mount sub-apps
app.route("/agents", agentsApp)
app.route("/user", userApp)
app.route("/models", modelsApp)

export default app
export type AppType = typeof app
```

### 2. Authentication Middleware (`lib/api/middleware/auth.ts`)

Reusable middleware for protected routes:

```typescript
import { createMiddleware } from "hono/factory"
import { auth } from "@/lib/auth"
import type { Session, User } from "better-auth"

// Context variables for authenticated routes
type AuthVariables = {
  session: Session
  user: User
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401)
    }
    
    c.set("session", session.session)
    c.set("user", session.user)
    await next()
  }
)
```

### 3. Simulation Mode Middleware (`lib/api/middleware/simulation.ts`)

Detects whether to use mock data or real Cursor API:

```typescript
import { createMiddleware } from "hono/factory"
import { getUserApiKey } from "@/lib/api-utils"

type SimulationVariables = {
  simulationMode: boolean
  apiKey: string | null
}

export const withSimulationMode = createMiddleware<{ Variables: SimulationVariables }>(
  async (c, next) => {
    const apiKey = await getUserApiKeyFromContext(c)
    const isSimulation = !isValidApiKey(apiKey)
    
    c.set("simulationMode", isSimulation)
    c.set("apiKey", apiKey)
    await next()
  }
)
```

### 4. Agents Routes (`lib/api/routes/agents.ts`)

Example of a modular route file with validation:

```typescript
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { requireAuth } from "../middleware/auth"
import { withSimulationMode } from "../middleware/simulation"
import { launchAgentSchema } from "@/lib/schemas/cursor/launch-agent"

const app = new Hono()

// All routes require auth and simulation mode detection
app.use("*", requireAuth)
app.use("*", withSimulationMode)

// GET /api/agents - List agents
app.get(
  "/",
  zValidator("query", z.object({
    page: z.string().optional().transform(v => parseInt(v || "0")),
    limit: z.string().optional().transform(v => parseInt(v || "20")),
  })),
  async (c) => {
    const { page, limit } = c.req.valid("query")
    const isSimulation = c.get("simulationMode")
    
    if (isSimulation) {
      // Return mock data
      const data = getSimulatedAgentsPaginated(page, limit)
      return c.json({ ...data, simulation: true })
    }
    
    // Call real Cursor API
    const apiKey = c.get("apiKey")!
    const response = await fetchAgents(apiKey, { page, limit })
    return c.json({ ...response, simulation: false })
  }
)

// POST /api/agents - Launch new agent
app.post(
  "/",
  zValidator("json", launchAgentSchema),
  async (c) => {
    const body = c.req.valid("json")
    const isSimulation = c.get("simulationMode")
    
    if (isSimulation) {
      const newAgent = createSimulatedAgent(body)
      return c.json({ ...newAgent, simulation: true }, 201)
    }
    
    const apiKey = c.get("apiKey")!
    const response = await launchAgent(apiKey, body)
    return c.json({ ...response, simulation: false }, 201)
  }
)

// GET /api/agents/:id - Get agent details
app.get("/:id", async (c) => {
  const id = c.req.param("id")
  // ... implementation
})

// DELETE /api/agents/:id - Delete agent
app.delete("/:id", async (c) => {
  const id = c.req.param("id")
  // ... implementation
})

// GET /api/agents/:id/conversation
app.get("/:id/conversation", async (c) => {
  const id = c.req.param("id")
  // ... implementation
})

// POST /api/agents/:id/followup
app.post("/:id/followup", async (c) => {
  const id = c.req.param("id")
  // ... implementation
})

// POST /api/agents/:id/stop
app.post("/:id/stop", async (c) => {
  const id = c.req.param("id")
  // ... implementation
})

export { app as agentsApp }
```

### 5. User Routes (`lib/api/routes/user.ts`)

```typescript
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { requireAuth } from "../middleware/auth"

const app = new Hono()

// All user routes require authentication
app.use("*", requireAuth)

// API Key routes
app.get("/api-key", async (c) => {
  const user = c.get("user")
  // ... implementation
})

app.post(
  "/api-key",
  zValidator("json", z.object({ apiKey: z.string().min(10) })),
  async (c) => {
    const user = c.get("user")
    const { apiKey } = c.req.valid("json")
    // ... implementation
  }
)

app.delete("/api-key", async (c) => {
  const user = c.get("user")
  // ... implementation
})

// Repository routes
app.get("/repositories", async (c) => { /* ... */ })
app.post(
  "/repositories",
  zValidator("json", z.object({
    repositories: z.array(z.object({
      url: z.string().url(),
      name: z.string().min(1),
    }))
  })),
  async (c) => { /* ... */ }
)

// Branch routes
app.get("/branches", async (c) => { /* ... */ })
app.post(
  "/branches",
  zValidator("json", z.object({
    branches: z.array(z.object({
      name: z.string().min(1),
    }))
  })),
  async (c) => { /* ... */ }
)

export { app as userApp }
```

### 6. Next.js Catch-All Handler (`app/api/[...route]/route.ts`)

```typescript
import { handle } from "hono/vercel"
import app from "@/lib/api"

// Export handlers for all HTTP methods
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
```

### 7. Error Handler Middleware (`lib/api/middleware/error-handler.ts`)

```typescript
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"

export const errorHandler = () =>
  createMiddleware(async (c, next) => {
    try {
      await next()
    } catch (err) {
      if (err instanceof HTTPException) {
        return err.getResponse()
      }
      
      console.error("API Error:", err)
      return c.json(
        { error: err instanceof Error ? err.message : "Internal server error" },
        500
      )
    }
  })
```

## Migration Steps

### Phase 1: Setup & Infrastructure
1. Install dependencies: `bun add hono @hono/zod-validator`
2. Create `lib/api/` directory structure
3. Implement middleware files (auth, error-handler, simulation)
4. Create main Hono app in `lib/api/index.ts`

### Phase 2: Migrate Routes (one domain at a time)
1. **Models route** (simplest, good for testing)
   - Create `lib/api/routes/models.ts`
   - Test that `/api/models` works correctly
   
2. **User routes** (api-key, repositories, branches)
   - Create `lib/api/routes/user.ts`
   - Migrate all three sub-routes
   - Test authentication middleware
   
3. **Agents routes** (most complex)
   - Create `lib/api/routes/agents.ts`
   - Migrate all agent operations
   - Test simulation mode middleware

### Phase 3: Cleanup
1. Delete old Next.js route handler files from `app/api/` (except auth)
2. Create the catch-all route handler `app/api/[...route]/route.ts`
3. Update any API utility functions as needed
4. Update documentation (CLAUDE.md)

### Phase 4: Testing & Validation
1. Run `bun run lint` to check for errors
2. Test all API endpoints manually or with scripts
3. Verify simulation mode still works
4. Verify authentication still works
5. Verify frontend functionality is unchanged

## Special Considerations

### Better Auth Integration

**Keep Better Auth separate** - The `/api/auth/[...all]` route uses `toNextJsHandler` from Better Auth which has special handling for cookies and headers. We'll keep this as a Next.js route handler and NOT migrate it to Hono.

The Hono routes will use `auth.api.getSession()` directly for authentication, which is already compatible.

### API Response Compatibility

All responses must maintain the same shape to avoid breaking the frontend:
- Agents responses include `simulation: boolean`
- Error responses use `{ error: string }` format
- Status codes remain the same

### Path Considerations

When using Hono with Next.js catch-all:
- The catch-all is at `app/api/[...route]/route.ts`
- The Hono app uses `.basePath("/api")`
- Auth routes are at `app/api/auth/[...all]/route.ts` (not handled by Hono)
- This means auth routes are matched first by Next.js before the catch-all

## Benefits of This Migration

1. **Validation** - Zod validators are applied declaratively per-route
2. **Type safety** - TypeScript knows about validated request shapes
3. **Middleware composition** - Clean, reusable middleware chains
4. **Testability** - Hono apps can be tested without starting a server
5. **Future OpenAPI support** - Can add `@hono/zod-openapi` for auto-generated docs
6. **Better error handling** - Centralized error handling with HTTPException
7. **Cleaner code** - Route definitions are more concise and expressive

## File Checklist

### Create New Files
- [ ] `lib/api/index.ts` - Main Hono app
- [ ] `lib/api/middleware/auth.ts` - Auth middleware
- [ ] `lib/api/middleware/error-handler.ts` - Error handling
- [ ] `lib/api/middleware/simulation.ts` - Simulation mode detection
- [ ] `lib/api/routes/agents.ts` - Agents routes
- [ ] `lib/api/routes/user.ts` - User routes
- [ ] `lib/api/routes/models.ts` - Models route
- [ ] `lib/api/utils/cursor-api.ts` - Cursor API client (optional refactor)
- [ ] `app/api/[...route]/route.ts` - Catch-all handler

### Delete Old Files (after migration complete)
- [ ] `app/api/agents/route.ts`
- [ ] `app/api/agents/[id]/route.ts`
- [ ] `app/api/agents/[id]/conversation/route.ts`
- [ ] `app/api/agents/[id]/followup/route.ts`
- [ ] `app/api/agents/[id]/stop/route.ts`
- [ ] `app/api/user/api-key/route.ts`
- [ ] `app/api/user/repositories/route.ts`
- [ ] `app/api/user/branches/route.ts`
- [ ] `app/api/models/route.ts`

### Keep Unchanged
- [x] `app/api/auth/[...all]/route.ts` - Better Auth (do not migrate)

## Validation Schemas

Existing Zod schemas to leverage:
- `lib/schemas/cursor/launch-agent.ts` - Launch agent request validation
- `lib/schemas/settings.ts` - Settings form validation

New schemas to create:
- API key save schema
- Repositories save schema
- Branches save schema
- Query parameter schemas for pagination

## Timeline Estimate

- Phase 1 (Setup): ~1 hour
- Phase 2 (Migration): ~2-3 hours
- Phase 3 (Cleanup): ~30 minutes
- Phase 4 (Testing): ~1 hour

**Total: ~5-6 hours**

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking frontend | Keep response shapes identical, test thoroughly |
| Auth issues | Use same `auth.api.getSession()` pattern |
| Path conflicts | Ensure auth routes match before catch-all |
| Missing middleware | Copy all functionality from existing handlers |
