# E2E Testing with Playwright

## Test Flow Overview

The E2E test (`user-journey.spec.ts`) covers the complete user journey from signup to account deletion:

1. **Landing Page** - Verifies key elements are present
2. **Sign Up Flow** - Tests account creation with password validation
3. **Dashboard & API Key Prompt** - Verifies post-signup redirect and API key prompt
4. **Settings Configuration** - Tests saving branches configuration
5. **Navigation Test** - Verifies branch selection works on the launch agent page
6. **Sign Out** - Tests user logout flow
7. **Sign In Flow** - Tests user login with existing credentials
8. **Account Deletion** - Tests complete account deletion with confirmation

## Test Account Management

E2E tests use timestamped email addresses to avoid conflicts: `playwright-{timestamp}@example.com`

### Why Timestamped Emails?

Test accounts are created with unique timestamped emails to ensure test isolation. Each test run creates accounts with unique identifiers, preventing conflicts between test runs.

### Test Account Lifecycle

**Accounts are automatically deleted at the end of each test run.** The test completes the full user journey including account deletion:

1. Test creates a unique account with email `playwright-{timestamp}@example.com`
2. Test exercises the full user flow (signup, settings, navigation, sign out, sign in)
3. Test deletes the account using the delete account button
4. Account and all associated data are permanently removed from the database

The account deletion flow:
- Opens a confirmation dialog requiring the user to type "DELETE"
- Calls a Convex mutation to delete all user data (agents, conversations, repositories, branches, tasks, time logs)
- Signs out the user
- Redirects to the home page

**Note:** If a test fails before reaching the deletion step, test accounts may remain in the database. These can be identified by their email pattern: `playwright-{timestamp}@example.com` and can be manually cleaned up if needed.

### Running Tests

```bash
# Run E2E tests
bun run test:e2e

# Run with UI
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug
```
