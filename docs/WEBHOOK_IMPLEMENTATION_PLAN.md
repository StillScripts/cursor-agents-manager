# Webhook Implementation Plan

## Overview

This document outlines the plan to migrate from user-configurable webhooks to a centralized webhook system using environment variables, and implement a webhook handler to receive status updates from Cursor.

## Part 1: Environment Variable Webhook Configuration ✅

### Objectives
- Remove webhook configuration from the launch agent form
- Use a single webhook URL configured via environment variable
- Automatically include webhook in all agent launch requests

### Implementation Steps

1. **Environment Variable Configuration**
   - Add `CURSOR_WEBHOOK_URL` to `.env.local` (required)
   - Add `CURSOR_WEBHOOK_SECRET` to `.env.local` (optional, but recommended for security)
   - Update environment documentation in `AGENTS.md` and `README.md`

2. **Schema Updates**
   - Keep `webhookSchema` in `lib/schemas/cursor/launch-agent.ts` for API compatibility
   - Update `formDataToApiRequest()` to automatically add webhook from env vars
   - Remove webhook from `launchAgentFormSchema` (keep it in base schema)

3. **Form Updates**
   - Remove webhook fields from `components/forms/launch-agent-form.tsx`
   - Remove "Advanced Settings" accordion section containing webhook fields
   - Update default form values to remove webhook

4. **API Route Updates**
   - In `lib/hono/routes/agents.ts`, modify POST handler to inject webhook from env vars
   - Validate that `CURSOR_WEBHOOK_URL` is set in environment
   - Include webhook in request to Cursor API only if env var is configured

### Files to Modify
- `lib/schemas/cursor/launch-agent.ts` - Remove webhook from form schema, update conversion function
- `components/forms/launch-agent-form.tsx` - Remove webhook UI fields
- `lib/hono/routes/agents.ts` - Inject webhook from env vars
- `AGENTS.md` - Update environment configuration docs
- `README.md` - Update environment setup instructions

## Part 2: Webhook Handler Route

### Objectives
- Create a new Hono route to handle incoming webhook requests from Cursor
- Verify webhook signatures for security
- Update agent status in the database when status changes occur
- Support future push notification integration

### Webhook Specification (from Cursor Documentation)

**Headers:**
- `X-Webhook-Signature`: HMAC-SHA256 signature in format `sha256=<hex_digest>`
- `X-Webhook-ID`: Unique identifier for this delivery (useful for logging)
- `X-Webhook-Event`: Event type (currently only `statusChange`)
- `User-Agent`: Always `Cursor-Agent-Webhook/1.0`

**Signature Verification:**
- Compute HMAC-SHA256 of the raw request body using the webhook secret
- Compare computed signature with `X-Webhook-Signature` header
- Must use raw request body (before any parsing) for signature computation

**Payload Format:**
- JSON payload with status change information
- Includes agent ID, new status, and other relevant fields
- Some fields are optional and only included when available

### Implementation Plan

#### Phase 1: Basic Webhook Handler (Current Phase)

**Step 1: Create Webhook Route File**
- Create `lib/hono/routes/webhooks.ts`
- Define a POST endpoint at `/api/webhooks/cursor`
- Route should NOT require authentication (webhooks come from external service)
- Route should accept raw body for signature verification

**Step 2: Signature Verification Middleware**
- Create `lib/hono/middleware/webhook-verification.ts`
- Verify `X-Webhook-Signature` header using HMAC-SHA256
- Use `CURSOR_WEBHOOK_SECRET` from environment (must be set if webhook URL is set)
- Return 401 if signature verification fails
- Log verification failures for debugging

**Step 3: Webhook Payload Schema**
- Create `lib/schemas/cursor/webhook.ts`
- Define Zod schema for webhook payload based on Cursor's format
- Include agent ID, status, and other fields
- Validate payload before processing

**Step 4: Database Update Logic**
- Use existing `updateAgentCache()` function from `lib/server/agents-cache.ts`
- Challenge: Webhook payload doesn't include `userId` - need to find agent owner
- Solution options:
  1. Query agents table by agent ID (agents are unique per user in our system)
  2. Store agent-to-user mapping in a separate table (overkill)
  3. Accept that we need to query by agent ID and handle multi-user edge cases
  
- Update agent status and other changed fields
- Update `updatedAt` timestamp
- Set `syncStatus` to "synced" on successful webhook update

**Step 5: Error Handling & Logging**
- Log all webhook deliveries (success and failure) with `X-Webhook-ID`
- Return appropriate HTTP status codes:
  - 200: Successfully processed
  - 400: Invalid payload format
  - 401: Signature verification failed
  - 404: Agent not found in database
  - 500: Internal server error

**Step 6: Mount Route in Hono App**
- Add webhook route to `lib/hono/index.ts`
- Mount at `/webhooks/cursor` path

#### Phase 2: Enhanced Features (Future)

**User Identification Strategy**

Since webhooks don't include user information, we need a reliable way to identify the agent owner:

1. **Direct Query Approach (Recommended for Phase 1)**
   - Query `agents` table by `id` (agent ID from webhook payload)
   - Since agents are created per-user and stored with `userId`, this should work
   - Risk: If agent IDs could theoretically collide across users (unlikely with Cursor's format)
   - Solution: Add validation that exactly one agent is found

2. **Agent ID Format Analysis**
   - Cursor agent IDs appear to be globally unique (e.g., `bc_abc123`)
   - Verify this assumption with testing
   - If globally unique, query is safe

3. **Multi-User Edge Case Handling**
   - If query returns multiple agents (shouldn't happen), log error and skip update
   - If query returns zero agents, log and return 404
   - This could happen if webhook arrives before agent is cached, or if agent was deleted

**Webhook Delivery Reliability**

1. **Idempotency**
   - Use `X-Webhook-ID` to track processed webhooks
   - Store processed webhook IDs in database (new table: `webhook_deliveries`)
   - Skip processing if webhook ID already processed (prevents duplicate updates)

2. **Retry Handling**
   - Cursor may retry failed webhooks
   - Return 5xx errors only for truly retryable conditions
   - Return 4xx errors for permanent failures (don't retry)

3. **Agent Creation Race Condition**
   - Webhook might arrive before agent is saved to database
   - Options:
     a. Store webhook delivery and process after agent creation (complex)
     b. Accept that first webhook might fail, subsequent ones will work
     c. Ensure agent is saved to cache before returning from launch endpoint (already done)

**Push Notification Integration (Future)**

Once webhook handler is stable:

1. **WebSocket/SSE Setup**
   - Implement real-time connection per user
   - Store active connections with user ID mapping

2. **Webhook to Push Notification Bridge**
   - When webhook updates agent status, find user ID
   - Send push notification to user's active connections
   - Include agent ID, new status, and relevant updates

3. **Client-Side Integration**
   - React Query refetch on notification
   - Optimistic UI updates
   - Toast notifications for status changes

### Files to Create

1. `lib/hono/routes/webhooks.ts` - Webhook handler route
2. `lib/hono/middleware/webhook-verification.ts` - Signature verification middleware
3. `lib/schemas/cursor/webhook.ts` - Webhook payload schema
4. `lib/hono/__tests__/routes/webhooks.test.ts` - Tests for webhook handler

### Files to Modify

1. `lib/hono/index.ts` - Mount webhook route
2. `lib/hono/routes/agents.ts` - Inject webhook from env vars (Part 1)
3. `lib/server/agents-cache.ts` - Possibly add helper for webhook updates
4. Environment documentation files

### Database Considerations

**Current Schema:**
- `agents` table has `id`, `userId`, `status`, `updatedAt`, `syncStatus`
- Agent IDs are unique per user (enforced by primary key on `id`)
- Updates can be done via `updateAgentCache()` which filters by `agentId` and `userId`

**Webhook Update Challenge:**
- Webhook payload doesn't include `userId`
- Need to query agent by ID to get userId, then update
- Alternative: Create a helper function that updates by agent ID only (assumes global uniqueness)

**Recommended Approach:**
1. Query agent by ID to get userId (for security/validation)
2. Use existing `updateAgentCache(agentId, userId, updates)` function
3. If agent not found, log and return 404 (might be race condition or deleted agent)

### Security Considerations

1. **Signature Verification**
   - Critical: Always verify webhook signature
   - Use raw request body (before JSON parsing) for signature computation
   - Fail fast on invalid signatures (401 response)

2. **Rate Limiting**
   - Consider rate limiting webhook endpoint
   - Cursor should have reasonable rate limits, but protect against abuse

3. **User Identification**
   - Validate that agent exists and belongs to a user before updating
   - Don't expose user information in error messages

4. **Secret Management**
   - `CURSOR_WEBHOOK_SECRET` must be at least 32 characters (Cursor requirement)
   - Store in environment variable, never in code
   - Document in setup instructions

### Testing Strategy

1. **Unit Tests**
   - Test signature verification with valid/invalid signatures
   - Test payload schema validation
   - Test database update logic

2. **Integration Tests**
   - Mock Cursor webhook requests
   - Test full flow: webhook → verification → database update
   - Test error cases (invalid signature, missing agent, etc.)

3. **Manual Testing**
   - Use ngrok or similar to expose local endpoint
   - Configure webhook URL in Cursor (or use curl to simulate)
   - Verify webhooks are received and processed correctly
   - Check database updates

### Environment Variables

Add to `.env.local`:

```bash
# Cursor Webhook Configuration
CURSOR_WEBHOOK_URL=https://your-app.com/api/webhooks/cursor
CURSOR_WEBHOOK_SECRET=your-webhook-secret-min-32-chars
```

**Note:** `CURSOR_WEBHOOK_URL` should point to your production/public URL. For local development, use a tunneling service like ngrok.

### Next Steps After Phase 1

1. Monitor webhook delivery in production
2. Add webhook delivery logging/analytics
3. Implement idempotency tracking
4. Add push notification support
5. Consider webhook replay/recovery mechanisms

