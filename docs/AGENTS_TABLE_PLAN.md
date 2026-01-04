# Agent Database Table - Implementation Plan

## Overview

This plan outlines the implementation of a new `agents` table in the database to cache agent data from external providers (Cursor API, future Claude Code API, etc.) to reduce API calls, improve performance, and avoid rate limits.

## Problem Statement

**Current Architecture:**
- Every agent detail view hits Cursor API to fetch agent data
- Every agents list hits Cursor API for pagination
- High latency (API round-trip on every request)
- Rate limit concerns with frequent polling
- No offline capability
- Repeated fetches of static data (finished agents don't change)

**Goals:**
1. Reduce Cursor API calls by 80-90%
2. Improve page load performance (database is faster than external API)
3. Support multiple agent providers (Cursor, Claude Code, future)
4. Enable offline viewing of cached agents
5. Maintain data freshness for active agents

## Database Schema Design

### Core `agents` Table

```sql
CREATE TABLE agents (
  -- Primary identification
  id TEXT PRIMARY KEY,              -- Provider's agent ID (e.g., bc_abc123)
  user_id TEXT NOT NULL,            -- Link to user who owns this agent
  provider TEXT NOT NULL,           -- 'cursor' | 'claude-code' | future providers

  -- Agent metadata
  name TEXT NOT NULL,               -- Display name/title
  status TEXT NOT NULL,             -- CREATING | RUNNING | FINISHED | ERROR | EXPIRED

  -- Source information (stored as JSON for flexibility)
  source_repository TEXT NOT NULL,  -- GitHub URL
  source_ref TEXT,                  -- Branch/tag/commit

  -- Target information (stored as JSON for flexibility)
  target_branch_name TEXT,          -- Created branch name
  target_url TEXT,                  -- Agent workspace URL
  target_pr_url TEXT,               -- Pull request URL (if created)
  target_auto_create_pr INTEGER DEFAULT 0,  -- Boolean flag

  -- Model & configuration
  model TEXT,                       -- Model used (e.g., claude-3-5-sonnet-20241022)

  -- Content & summary
  summary TEXT,                     -- Agent's work summary (from API or AI-generated)

  -- Provider-specific data (stored as JSON for extensibility)
  provider_data TEXT,               -- JSON blob for provider-specific fields

  -- Timestamps (using INTEGER for consistency with existing schema)
  created_at INTEGER NOT NULL,      -- When agent was created (Unix timestamp)
  updated_at INTEGER NOT NULL,      -- Last time we synced with provider API
  cached_at INTEGER NOT NULL,       -- When we last cached this data

  -- Sync control
  sync_status TEXT DEFAULT 'synced', -- 'synced' | 'stale' | 'error'
  sync_error TEXT,                  -- Last sync error message (if any)

  -- Soft delete
  deleted_at INTEGER,               -- NULL = active, Unix timestamp = soft deleted

  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_provider ON agents(provider);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_user_status ON agents(user_id, status);
CREATE INDEX idx_agents_updated_at ON agents(updated_at);
CREATE INDEX idx_agents_deleted_at ON agents(deleted_at);
```

### Drizzle Schema (TypeScript)

```typescript
// lib/schema/agents-schema.ts
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./auth-schema"

export const agents = sqliteTable(
  "agents",
  {
    // Primary identification
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["cursor", "claude-code"] }).notNull(),

    // Agent metadata
    name: text("name").notNull(),
    status: text("status", {
      enum: ["CREATING", "RUNNING", "FINISHED", "ERROR", "EXPIRED"],
    }).notNull(),

    // Source information
    sourceRepository: text("source_repository").notNull(),
    sourceRef: text("source_ref"),

    // Target information
    targetBranchName: text("target_branch_name"),
    targetUrl: text("target_url"),
    targetPrUrl: text("target_pr_url"),
    targetAutoCreatePr: integer("target_auto_create_pr", { mode: "boolean" }).default(false),

    // Model & configuration
    model: text("model"),

    // Content & summary
    summary: text("summary"),

    // Provider-specific data (JSON)
    providerData: text("provider_data", { mode: "json" }).$type<Record<string, unknown>>(),

    // Timestamps (using integer timestamps for consistency with existing schema)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    cachedAt: integer("cached_at", { mode: "timestamp" }).notNull(),

    // Sync control
    syncStatus: text("sync_status", { enum: ["synced", "stale", "error"] }).default("synced"),
    syncError: text("sync_error"),

    // Soft delete
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => ({
    userIdIdx: index("idx_agents_user_id").on(table.userId),
    providerIdx: index("idx_agents_provider").on(table.provider),
    statusIdx: index("idx_agents_status").on(table.status),
    userStatusIdx: index("idx_agents_user_status").on(table.userId, table.status),
    updatedAtIdx: index("idx_agents_updated_at").on(table.updatedAt),
    deletedAtIdx: index("idx_agents_deleted_at").on(table.deletedAt),
  })
)

export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
```

## Data Flow Architecture

### 1. Agent Creation Flow

```
User creates agent via form
  ↓
POST /api/agents
  ↓
Call Cursor API to create agent
  ↓
Receive LaunchAgentResponse
  ↓
Save to database (agents table)
  ↓
Return to client
```

**Implementation:**
```typescript
// lib/hono/routes/agents.ts - POST /
app.post("/", zValidator("json", launchAgentRequestSchema), async (c) => {
  const request = c.req.valid("json")
  const user = c.get("user")
  const apiKey = c.get("apiKey")

  // Call Cursor API
  const response = await fetch(CURSOR_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  const agentData = await response.json()

  // Save to database
  await db.insert(agents).values({
    id: agentData.id,
    userId: user.id,
    provider: "cursor",
    name: agentData.name,
    status: agentData.status,
    sourceRepository: agentData.source.repository,
    sourceRef: agentData.source.ref,
    targetBranchName: agentData.target.branchName,
    targetUrl: agentData.target.url,
    targetPrUrl: agentData.target.prUrl,
    targetAutoCreatePr: agentData.target.autoCreatePr,
    model: request.model,
    summary: agentData.summary,
    createdAt: new Date(agentData.createdAt),
    updatedAt: new Date(),
    cachedAt: new Date(),
    syncStatus: "synced",
  })

  return c.json(agentData, 201)
})
```

### 2. Agent List Flow (with Cache)

```
GET /api/agents
  ↓
Check database for cached agents
  ↓
If cache fresh (< 5 min for active agents):
  ↓ Return cached data
  └─ Done
  ↓
If cache stale:
  ↓
Fetch from Cursor API
  ↓
Update database cache
  ↓
Return updated data
```

**Cache Freshness Rules:**
- **CREATING/RUNNING agents:** Stale after 2 minutes
- **FINISHED/ERROR/EXPIRED agents:** Stale after 24 hours (rarely change)
- **User can force refresh:** Always fetch fresh data

**Implementation:**
```typescript
// lib/server/agents.ts
export async function getAgents(userId: string, options: {
  limit?: number
  forceRefresh?: boolean
  apiKey?: string | null
}) {
  const { limit = 10, forceRefresh = false, apiKey } = options

  // 1. Fetch from database
  const cachedAgents = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.userId, userId),
        isNull(agents.deletedAt)
      )
    )
    .orderBy(desc(agents.createdAt))
    .limit(limit)

  // 2. Determine which agents need refresh
  const now = Date.now()
  const agentsNeedingRefresh = cachedAgents.filter((agent) => {
    if (forceRefresh) return true

    const cachedAt = agent.cachedAt.getTime() // cachedAt is already a Date object
    const ageMinutes = (now - cachedAt) / 60000

    // Fresh if recently cached based on status
    if (agent.status === "CREATING" || agent.status === "RUNNING") {
      return ageMinutes > 2 // Refresh if older than 2 minutes
    }
    return ageMinutes > 1440 // Refresh if older than 24 hours
  })

  // 3. If in simulation mode or no agents need refresh, return cached
  if (!apiKey || agentsNeedingRefresh.length === 0) {
    return {
      agents: cachedAgents,
      simulation: !apiKey,
      source: "cache",
    }
  }

  // 4. Fetch fresh data from Cursor API
  try {
    const response = await fetch(
      `${CURSOR_API_URL}?limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    const data = await response.json()

    // 5. Update cache for each agent
    for (const freshAgent of data.agents) {
      await db
        .insert(agents)
        .values({
          id: freshAgent.id,
          userId,
          provider: "cursor",
          name: freshAgent.name,
          status: freshAgent.status,
          sourceRepository: freshAgent.source.repository,
          sourceRef: freshAgent.source.ref,
          targetBranchName: freshAgent.target.branchName,
          targetUrl: freshAgent.target.url,
          targetPrUrl: freshAgent.target.prUrl,
          targetAutoCreatePr: freshAgent.target.autoCreatePr,
          summary: freshAgent.summary,
          createdAt: new Date(freshAgent.createdAt),
          updatedAt: new Date(),
          cachedAt: new Date(),
          syncStatus: "synced",
        })
        .onConflictDoUpdate({
          target: agents.id,
          set: {
            name: freshAgent.name,
            status: freshAgent.status,
            targetPrUrl: freshAgent.target.prUrl,
            summary: freshAgent.summary,
            updatedAt: new Date(),
            cachedAt: new Date(),
            syncStatus: "synced",
            syncError: null,
          },
        })
    }

    return {
      agents: data.agents,
      simulation: false,
      source: "api",
    }
  } catch (error) {
    // On error, return cached data and mark as stale
    console.error("Failed to refresh agents:", error)
    return {
      agents: cachedAgents,
      simulation: false,
      source: "cache-stale",
      error: error.message,
    }
  }
}
```

### 3. Agent Detail Flow (with Cache)

```
GET /api/agents/:id
  ↓
Check database for cached agent
  ↓
If not in cache or force refresh:
  ↓ Fetch from Cursor API
  ↓ Save/update in database
  ↓
Return agent data
```

## Migration Strategy

### Phase 1: Add Table (No Breaking Changes)

1. **Create migration:**
   ```bash
   bun run db:generate
   ```

2. **Add schema file:** `lib/schema/agents-schema.ts`

3. **Export from main schema:** Add to `lib/schema/index.ts`

4. **Run migration:**
   ```bash
   bun run db:push
   ```

### Phase 2: Dual Write (Backward Compatible)

- Keep existing API behavior (direct Cursor API calls)
- Add database writes in parallel
- Verify data consistency
- Monitor for issues

**Code Example:**
```typescript
// Write to both API and DB
const apiResponse = await cursorAPI.createAgent(request)
await db.insert(agents).values(mapApiToDb(apiResponse)) // Add DB write

return apiResponse // Still return API response
```

### Phase 3: Hybrid Read (Cache-First)

- Read from database first
- Fall back to API if cache miss or stale
- Update cache after API fetch
- Log cache hit/miss rates

### Phase 4: Full Migration

- All reads go to database first
- API only called for:
  - Initial creation
  - Forced refresh
  - Cache invalidation
- Remove old direct API read code

## Multi-Provider Support

### Provider Abstraction Layer

```typescript
// lib/providers/types.ts
export interface AgentProvider {
  name: string
  createAgent(request: CreateAgentRequest): Promise<AgentResponse>
  getAgent(id: string): Promise<AgentResponse>
  listAgents(options: ListOptions): Promise<AgentResponse[]>
  deleteAgent(id: string): Promise<void>
  stopAgent(id: string): Promise<void>
}

// lib/providers/cursor.ts
export class CursorProvider implements AgentProvider {
  name = "cursor"

  async createAgent(request: CreateAgentRequest) {
    // Cursor-specific implementation
  }

  // ... other methods
}

// lib/providers/claude-code.ts (future)
export class ClaudeCodeProvider implements AgentProvider {
  name = "claude-code"

  async createAgent(request: CreateAgentRequest) {
    // Claude Code-specific implementation
  }

  // ... other methods
}

// lib/providers/factory.ts
export function getProvider(name: string, apiKey: string): AgentProvider {
  switch (name) {
    case "cursor":
      return new CursorProvider(apiKey)
    case "claude-code":
      return new ClaudeCodeProvider(apiKey)
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}
```

### Provider-Specific Data Storage

Use the `providerData` JSON field for provider-specific fields:

```typescript
// Cursor-specific data
{
  provider: "cursor",
  providerData: {
    webhook: { url: "...", secret: "..." },
    openAsCursorGithubApp: true,
    skipReviewerRequest: false,
  }
}

// Claude Code-specific data (future)
{
  provider: "claude-code",
  providerData: {
    skillsUsed: ["pdf", "web-search"],
    tokensUsed: 125000,
    model: "claude-sonnet-4-5",
  }
}
```

## Performance Optimizations

### 1. Selective Field Updates

Only update fields that actually changed:

```typescript
const updates: Partial<Agent> = {}
if (freshAgent.status !== cachedAgent.status) {
  updates.status = freshAgent.status
}
if (freshAgent.summary !== cachedAgent.summary) {
  updates.summary = freshAgent.summary
}

if (Object.keys(updates).length > 0) {
  await db.update(agents).set({
    ...updates,
    updatedAt: new Date(),
  }).where(eq(agents.id, agentId))
}
```

### 2. Batch Updates

Fetch and update multiple agents in one go:

```typescript
const agentIds = agentsNeedingRefresh.map(a => a.id)

// Batch fetch from Cursor API
const promises = agentIds.map(id =>
  fetch(`${CURSOR_API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
)

const responses = await Promise.allSettled(promises)

// Batch update database
const updates = responses
  .filter(r => r.status === "fulfilled")
  .map(r => mapApiToDb(r.value))

await db.transaction(async (tx) => {
  for (const update of updates) {
    await tx.insert(agents).values(update).onConflictDoUpdate(...)
  }
})
```

### 3. Background Sync Jobs

For active agents, sync in background:

```typescript
// lib/jobs/sync-agents.ts
export async function syncActiveAgents() {
  const activeAgents = await db
    .select()
    .from(agents)
    .where(
      and(
        or(
          eq(agents.status, "CREATING"),
          eq(agents.status, "RUNNING")
        ),
        isNull(agents.deletedAt)
      )
    )

  for (const agent of activeAgents) {
    try {
      const fresh = await fetchFromProvider(agent.provider, agent.id)
      await updateAgentInDb(fresh)
    } catch (error) {
      await markAgentStale(agent.id, error)
    }
  }
}

// Run every 2 minutes
setInterval(syncActiveAgents, 2 * 60 * 1000)
```

## Implementation Checklist

### Part 1: Database Setup
- [ ] Create `lib/schema/agents-schema.ts` with Drizzle schema
- [ ] Export from `lib/schema/index.ts`
- [ ] Generate migration: `bun run db:generate`
- [ ] Review migration SQL
- [ ] Apply migration: `bun run db:push`
- [ ] Verify table in Drizzle Studio: `bun run db:studio`

### Part 2: Core Functions
- [ ] Create `lib/server/agents-cache.ts` with cache helper functions
- [ ] Implement `saveAgentToCache()`
- [ ] Implement `getAgentFromCache()`
- [ ] Implement `updateAgentCache()`
- [ ] Implement `isAgentStale()`
- [ ] Implement `invalidateAgentCache()`
- [ ] Add unit tests for cache functions

### Part 3: API Integration
- [ ] Update `POST /api/agents` to save to database after creation
- [ ] Update `GET /api/agents` to check cache first
- [ ] Update `GET /api/agents/:id` to check cache first
- [ ] Update `DELETE /api/agents/:id` to soft delete in database
- [ ] Update `POST /api/agents/:id/stop` to update status in cache
- [ ] Add `?refresh=true` query param for force refresh

### Part 4: React Query Updates
- [ ] Update `useAgents()` hook to handle cache metadata
- [ ] Update `useAgent()` hook to handle cache metadata
- [ ] Add `useRefreshAgent()` hook for manual refresh
- [ ] Update invalidation logic to sync with database

### Part 5: UI Updates
- [ ] Add "Last updated" timestamp to agent cards
- [ ] Add refresh button to agent list
- [ ] Add loading states for refresh operations
- [ ] Show cache status indicator (fresh/stale)
- [ ] Add error handling for sync failures

### Part 6: Testing
- [ ] Test agent creation flow (API → DB)
- [ ] Test agent list with cache hits
- [ ] Test agent list with cache misses
- [ ] Test stale cache detection
- [ ] Test force refresh functionality
- [ ] Test simulation mode (no API key)
- [ ] Test multi-user isolation
- [ ] Load test cache performance

### Part 7: Monitoring
- [ ] Add logging for cache hits/misses
- [ ] Add metrics for API call reduction
- [ ] Monitor database query performance
- [ ] Set up alerts for sync failures

## Success Metrics

**Performance:**
- 80%+ reduction in Cursor API calls
- < 100ms average page load (vs 500-1000ms with API)
- 95%+ cache hit rate for finished agents

**Reliability:**
- < 1% sync error rate
- Data consistency checks pass
- Zero data loss

**User Experience:**
- Instant page loads for cached agents
- Real-time updates for active agents
- Clear indicators of data freshness

## Future Enhancements

1. **Real-time Updates via WebSockets**
   - Subscribe to agent status changes
   - Push updates to clients
   - Reduce polling frequency

2. **Offline Support**
   - Service worker for offline access
   - Queue mutations for later sync
   - Conflict resolution

3. **Advanced Caching**
   - Redis layer for faster access
   - Edge caching for global deployment
   - Partial updates (field-level caching)

4. **Analytics**
   - Track agent creation patterns
   - Monitor most-used repositories
   - Identify power users

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache invalidation bugs | Stale data shown | Add staleness indicators, force refresh option |
| Database size growth | Storage costs | Implement data retention policy (archive old agents) |
| Migration downtime | User disruption | Use dual-write pattern, zero-downtime deployment |
| Cursor API changes | Breaking changes | Version API client, add schema validation |
| Multi-provider complexity | Development overhead | Start with Cursor only, add abstraction later |

## Timeline Estimate

- **Week 1:** Database schema + migrations (Part 1)
- **Week 2:** Core cache functions + API integration (Parts 2-3)
- **Week 3:** React Query updates + UI (Parts 4-5)
- **Week 4:** Testing + monitoring (Parts 6-7)
- **Week 5:** Buffer for bugs + documentation

**Total:** ~5 weeks for full implementation

**MVP (cache-first reads only):** 2-3 weeks
