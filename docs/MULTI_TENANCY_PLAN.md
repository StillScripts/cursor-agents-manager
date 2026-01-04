# Multi-Tenancy Implementation Plan

## Overview

Implement per-user databases so each user has their own isolated database for their data (settings, repositories, branches, agents, etc.), while keeping authentication in a shared master database.

## Current State

- **Single shared database**: All user data stored together with `userId` foreign keys
- **Infrastructure exists**: `userDatabases` table and `TursoManager` class already in place
- **Schema ready**: User schema defined in `lib/schema/user-schema.ts`

## Target Architecture

```
Master DB (Auth)
├── user (accounts)
├── session (active sessions)
├── account (credentials)
├── user_api_keys (encrypted keys)
├── user_databases (connection info per user)
└── user_agents (agent ID → user ID mapping) ⭐ NEW

User Database (per user)
├── repositories
├── branches
├── user_settings
├── time_logs
└── agents
```

**Why `user_agents` table?**
- Webhooks come with only an agent ID (no user context)
- Need to look up which user's database contains the agent
- Enables cross-database agent lookups without scanning all user databases
- Fast lookup: O(1) query instead of scanning all user databases

**Webhook Flow with Multi-Tenancy**:
```
1. Webhook arrives with agent ID: "agent-123"
2. Query master DB: SELECT userId FROM user_agents WHERE id = 'agent-123'
3. Get user's database: getUserDatabase(userId)
4. Update agent in user's database: UPDATE agents SET status = ... WHERE id = 'agent-123'
```

**Agent Creation Flow**:
```
1. User creates agent → Insert into user's database
2. Also insert mapping: INSERT INTO user_agents (id, userId) VALUES ('agent-123', userId)
3. Future webhooks can now find the user via this mapping
```

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1.1 Add User-Agent Mapping Table
**File**: `lib/schema/auth-schema.ts`

**New table**: `user_agents`
```typescript
export const userAgents = sqliteTable("user_agents", {
  id: text("id").primaryKey(), // Agent ID from Cursor (primary key = automatic index)
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

// Optional: Index on userId for reverse lookups (if needed)
export const userAgentsUserIdIdx = index("idx_user_agents_user_id").on(userAgents.userId)
```

**Purpose**:
- Maps Cursor Agent ID → User ID
- Enables webhook handlers to find which user's database to update
- Primary key on `id` provides automatic index for fast lookups
- Cascade delete: When user is deleted, their agent mappings are removed

**Migration**: Add to existing auth schema migration

#### 1.2 Create User Database Helper Module
**File**: `lib/user-db.ts`

**Functions needed**:
- `getUserDatabase(userId: string)` - Get Drizzle client for user's database
- `createUserDatabase(userId: string)` - Create new user database via Turso API
- `withUserDatabase(userId, callback)` - Helper for running queries
- `getUserIdByAgentId(agentId: string)` - Look up user ID from agent ID (for webhooks) ⭐ NEW

**Dependencies**:
- Query `userDatabases` table from master DB
- Query `userAgents` table from master DB (for agent lookups)
- Decrypt auth token using `lib/encryption.ts`
- Use `TursoManager` to create databases and get clients

#### 1.2 Update Schema Initialization
**File**: `lib/turso-manager.ts`

**Update `initializeUserSchema()` method**:
- Create all tables from `user-schema.ts`:
  - `repositories` (with `user_id` column, no FK)
  - `branches` (with `user_id` column, no FK)
  - `user_settings` (with `user_id` column, no FK)
  - `time_logs` (with `user_id` column, no FK)
  - `agents` (with `user_id` column, no FK)
- Create indexes for performance (matching `user-schema.ts` indexes)
- Remove foreign key constraints (user DB doesn't have `user` table)

### Phase 2: User Creation Hook

#### 2.1 Create Database Creation API Route
**File**: `app/(server)/api/user/create-database/route.ts`

**Functionality**:
- POST endpoint that requires authentication
- Calls `createUserDatabase(userId)` for authenticated user
- Idempotent (returns success if database already exists)
- Error handling for Turso API failures

#### 2.2 Hook into Signup Flow
**File**: `components/forms/signup-form.tsx`

**Options**:
- **Option A (Recommended)**: Call API route after successful signup
  - After `signUp.email()` succeeds, call `/api/user/create-database`
  - Don't fail signup if DB creation fails (can retry later)
  
- **Option B**: Server-side hook in Better Auth (if supported)
  - Create database in auth callback/hook
  - More complex but cleaner separation

**Decision**: Use Option A for simplicity

### Phase 3: Update Queries

#### 3.1 Update Cache Functions
**File**: `lib/cache/user-data.ts`

**Changes**:
- `getCachedUserRepositories()`: Use `getUserDatabase(userId)` instead of `db`
- `getCachedUserBranches()`: Use `getUserDatabase(userId)` instead of `db`

**Pattern**:
```typescript
// Before
return db.select().from(repositories).where(...)

// After
const userDb = await getUserDatabase(userId)
return userDb.select().from(repositories).where(...)
```

#### 3.2 Update User API Routes
**File**: `lib/hono/routes/user.ts`

**Routes to update**:
- `GET /api/user/repositories` - Already uses cache function (update cache function)
- `POST /api/user/repositories` - Update to use `getUserDatabase()`
- `GET /api/user/branches` - Already uses cache function (update cache function)
- `POST /api/user/branches` - Update to use `getUserDatabase()`
- `GET /api/user/time-logs` - Update to use `getUserDatabase()`
- `POST /api/user/time-logs` - Update to use `getUserDatabase()`

**Pattern for mutations**:
```typescript
const userDb = await getUserDatabase(user.id)
await userDb.delete(repositories).where(...)
await userDb.insert(repositories).values(...)
```

#### 3.3 Update Agent Queries
**File**: `lib/server/agents-cache.ts`

**Functions to update**:
- Any functions that query `agents` table
- Use `getUserDatabase(userId)` instead of master `db`

**Special case - Agent creation**:
- When creating agent in user DB, also insert into master DB's `user_agents` table
- Pattern:
```typescript
// 1. Insert agent in user's database
const userDb = await getUserDatabase(userId)
await userDb.insert(agents).values(agentData)

// 2. Insert mapping in master DB
await db.insert(userAgents).values({
  id: agentData.id,
  userId: userId,
  createdAt: new Date(),
})
```

#### 3.4 Update Webhook Handler
**File**: `lib/hono/routes/webhooks.ts`

**Current flow**: Webhook receives agent ID → updates agent directly

**New flow**:
1. Receive webhook with agent ID
2. Look up userId from `user_agents` table in master DB
3. Get user's database
4. Update agent in user's database

**Implementation**:
```typescript
// In webhook handler
const userId = await getUserIdByAgentId(payload.id)
if (!userId) {
  return c.json({ error: "Agent not found" }, 404)
}

const userDb = await getUserDatabase(userId)
const updatedAgent = await userDb
  .update(agents)
  .set(updates)
  .where(eq(agents.id, payload.id))
  .returning()
```

**Also update**: `lib/server/agents-cache.ts` - `updateAgentByIdOnly()` function
- Should use `getUserIdByAgentId()` to find user, then update in user DB

#### 3.5 Update Settings Queries
**Files**: Any files that query `userSettings` table

**Search for**: All usages of `userSettings` from `user-schema.ts`
**Update**: Replace `db` with `getUserDatabase(userId)`

### Phase 4: Error Handling & Edge Cases

#### 4.1 Handle Missing User Database
**Strategy**: Create on-demand if missing

**Implementation**:
- In `getUserDatabase()`, if database not found:
  - Option A: Throw error (caller handles)
  - Option B: Auto-create (simpler UX, but may hide issues)
  
**Decision**: Option A (explicit creation), but provide helper:
```typescript
async function ensureUserDatabase(userId: string) {
  try {
    return await getUserDatabase(userId)
  } catch {
    await createUserDatabase(userId)
    return await getUserDatabase(userId)
  }
}
```

#### 4.2 Handle Database Creation Failures
**Scenarios**:
- Turso API rate limits
- Network failures
- Invalid credentials

**Strategy**:
- Log errors
- Don't block user signup (database can be created later)
- Provide retry mechanism in admin/settings page

### Phase 5: Migration (Existing Users)

#### 5.1 Create Migration Script
**File**: `scripts/migrate-to-multi-tenant.ts`

**Steps**:
1. Query all users from master DB
2. For each user:
   - Create user database
   - Copy data from master DB to user DB:
     - `repositories` → user DB
     - `branches` → user DB
     - `user_settings` → user DB
     - `time_logs` → user DB
     - `agents` → user DB
   - **Create `user_agents` mappings**:
     - For each agent in user DB, insert into master DB's `user_agents` table
     - Maps agent ID → user ID for webhook lookups
3. Verify data integrity
4. Log migration status

**Safety**:
- Run in dry-run mode first
- Backup master DB before migration
- Verify each user's data after migration
- Keep master DB data until verified

#### 5.2 Migration Verification
**Checks**:
- Row counts match between master and user DBs
- Sample data verification
- Test queries work correctly

### Phase 6: Testing

#### 6.1 Unit Tests
**Files**: `lib/hono/__tests__/`

**Test cases**:
- `getUserDatabase()` with valid/invalid userId
- `createUserDatabase()` success and duplicate cases
- Query functions with user databases
- Error handling

#### 6.2 Integration Tests
**Scenarios**:
1. New user signup → database created
2. Query user data → comes from user DB
3. Update user data → updates user DB
4. Multiple users → data isolation verified

#### 6.3 Manual Testing Checklist
- [ ] Sign up new user → database created
- [ ] Query repositories → works
- [ ] Save repositories → works
- [ ] Query branches → works
- [ ] Save branches → works
- [ ] Query agents → works
- [ ] Create agent → agent created in user DB + mapping in master DB ⭐ NEW
- [ ] Webhook received → correctly finds user and updates agent ⭐ NEW
- [ ] Two users → data isolated
- [ ] Error handling → graceful failures

### Phase 7: Cleanup (Optional)

#### 7.1 Remove User Tables from Master DB
**After migration verified**:
- Remove `repositories` table from master DB
- Remove `branches` table from master DB
- Remove `user_settings` table from master DB
- Remove `time_logs` table from master DB
- Remove `agents` table from master DB

**Note**: 
- Keep `user_agents` table in master DB (needed for webhook lookups) ⭐ IMPORTANT
- Keep `user_id` columns in user DBs for consistency, but remove foreign keys

#### 7.2 Update Documentation
**Files to update**:
- `AGENTS.md` - Update database architecture section
- `README.md` - Update architecture description

## File Changes Summary

### New Files
- `lib/user-db.ts` - User database helper functions
- `app/(server)/api/user/create-database/route.ts` - Database creation endpoint
- `scripts/migrate-to-multi-tenant.ts` - Migration script

### Modified Files
- `lib/schema/auth-schema.ts` - Add `user_agents` table ⭐ NEW
- `lib/turso-manager.ts` - Update `initializeUserSchema()`
- `lib/cache/user-data.ts` - Use `getUserDatabase()` instead of `db`
- `lib/hono/routes/user.ts` - Use `getUserDatabase()` for all routes
- `lib/server/agents-cache.ts` - Use `getUserDatabase()` for agent queries, insert into `user_agents` on create ⭐ UPDATED
- `lib/hono/routes/webhooks.ts` - Use `getUserIdByAgentId()` to find user, then update in user DB ⭐ UPDATED
- `lib/hono/routes/agents.ts` - Insert into `user_agents` when creating agents ⭐ UPDATED
- `components/forms/signup-form.tsx` - Call database creation API
- Any other files querying user-schema tables

## Dependencies & Prerequisites

### Environment Variables
- `TURSO_ORG_NAME` - Turso organization name
- `TURSO_API_TOKEN` - Turso API token (for creating databases)
- `ENCRYPTION_SECRET` - For encrypting database auth tokens

### Turso API Requirements
- Ability to create databases via API
- Ability to create auth tokens for databases
- Sufficient quota/limits for per-user databases

## Risks & Considerations

### Cost
- **Risk**: Each user database costs money (Turso pricing)
- **Mitigation**: Monitor database count and costs
- **Alternative**: Consider database-per-organization instead of per-user

### Complexity
- **Risk**: More complex queries (need to get user DB first)
- **Mitigation**: Helper functions abstract complexity
- **Impact**: Slight performance overhead (one extra query to get DB connection)

### Migration
- **Risk**: Data loss during migration
- **Mitigation**: 
  - Backup before migration
  - Verify data integrity
  - Keep master DB data until verified
  - Test migration on staging first

### Foreign Keys
- **Risk**: Can't use FKs between master and user DBs
- **Mitigation**: Already handled - user DBs don't have `user` table
- **Impact**: Need to maintain referential integrity in application code

## Success Criteria

- [ ] New users automatically get their own database
- [ ] All user data queries use user databases
- [ ] `user_agents` mapping table created and populated ⭐ NEW
- [ ] Agent creation inserts into both user DB and master DB mapping ⭐ NEW
- [ ] Webhook handler correctly finds user and updates agent ⭐ NEW
- [ ] Data isolation between users verified
- [ ] Existing users migrated successfully (including `user_agents` mappings) ⭐ UPDATED
- [ ] No data loss during migration
- [ ] Performance acceptable (queries still fast)
- [ ] Error handling graceful
- [ ] Tests passing

## Timeline Estimate

- **Phase 1** (Infrastructure): 2-3 hours
  - Add `user_agents` table: 30 min ⭐ NEW
  - Helper functions: 1.5-2 hours
  - Schema initialization: 30 min
- **Phase 2** (User Creation): 1 hour
- **Phase 3** (Update Queries): 4-5 hours ⭐ UPDATED
  - Agent queries: 1.5 hours
  - Webhook handler: 1 hour ⭐ NEW
  - Agent creation mapping: 30 min ⭐ NEW
  - Other queries: 1-2 hours
- **Phase 4** (Error Handling): 1-2 hours
- **Phase 5** (Migration): 2-3 hours
  - Include `user_agents` migration: +30 min ⭐ NEW
- **Phase 6** (Testing): 2-3 hours
- **Phase 7** (Cleanup): 1 hour

**Total**: ~13-18 hours (slight increase for webhook/mapping work)

## Next Steps

1. Review and approve plan
2. Start with Phase 1 (Core Infrastructure)
3. Test each phase before moving to next
4. Deploy incrementally (feature flag optional)

