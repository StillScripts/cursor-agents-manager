# E2E Testing with Playwright

## Test Account Management

E2E tests use timestamped email addresses to avoid conflicts: `playwright-{timestamp}@example.com`

### Why Timestamped Emails?

Better Auth requires email verification for account deletion, which makes it difficult to test the full deletion flow in Playwright. Instead, we:

1. **Create test accounts** with unique timestamped emails
2. **Clean up test accounts** via a Convex action that bypasses email verification

### Cleaning Up Test Accounts

Test accounts can be cleaned up manually or via a scheduled job:

#### Manual Cleanup

```bash
# From the packages/backend directory
bunx convex run users:cleanupTestAccounts
```

#### Scheduled Cleanup (Recommended)

Set up a Convex scheduled function to run periodically. Add to `packages/backend/convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Clean up test accounts daily at 2 AM
crons.daily(
  "cleanup-test-accounts",
  {
    hourUTC: 2,
    minuteUTC: 0,
  },
  internal.users.cleanupTestAccounts
)

export default crons
```

### What Gets Cleaned Up?

The `cleanupTestAccounts` action deletes all accounts matching:
- `playwright@example.com` (legacy)
- `playwright-{timestamp}@example.com` (current pattern)

It removes:
- User account and all Better Auth records (sessions, accounts, verifications)
- All user data (agents, API keys, branches, repositories, tasks, time logs, conversations)

### Running Tests

```bash
# Run E2E tests
bun run test:e2e

# Run with UI
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug
```
