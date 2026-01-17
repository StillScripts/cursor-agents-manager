# Rate Limiting Implementation

## Overview

Rate limiting has been implemented for key Convex endpoints that interact with external AI services (Cursor API and OpenAI API) to enhance stability, security, and prevent abuse.

## Implementation Details

### Configuration

The rate limiter component is configured in `convex.config.ts`:

```typescript
import rateLimiter from "@convex-dev/rate-limiter/convex.config"
app.use(rateLimiter)
```

### Rate Limiter Instances

Rate limiter instances are defined in `rateLimiting.ts` with per-user rate limiting using keys in the format: `{endpoint}:{userId}`.

### Cursor API Endpoints

Rate limits for Cursor API endpoints are based on realistic power user usage patterns:

| Endpoint | Rate Limit (RPM) | Rationale |
|----------|------------------|-----------|
| `launchAgent` | 5 | Power users might launch 2-3 agents quickly, but not 10+ per minute |
| `getAgents` | 20 | Refreshing agent list, reasonable for active monitoring |
| `getAgentById` | 20 | Viewing individual agent details |
| `getConversation` | 30 | Refreshing conversation view, auto-refresh scenarios |
| `getConversationWithCursor` | 20 | Reading conversation data with pagination |
| `sendFollowUp` | 10 | Sending follow-up messages to agents |
| `stopAgent` | 5 | Stopping running agents |
| `deleteAgent` | 3 | Destructive operation, should be rare |
| `getModels` | 10 | Checking available models, usually cached |

### OpenAI API Endpoints

Rate limits for OpenAI API endpoints are based on realistic power user usage patterns:

| Endpoint | Rate Limit (RPM) | Rationale |
|----------|------------------|-----------|
| `summarizeConversation` | 3 | Users typically generate 1-2 summaries per conversation, maybe 3-5 per hour |
| `transcribeAudio` | 5 | Users might transcribe a few audio clips, but not 30 per minute |
| `textToSpeech` | 10 | Similar to transcribe, generating audio for summaries |
| `improvePrompt` | 5 | Users might improve prompts a few times, but not constantly |

## Usage Pattern

Rate limiting is applied at the beginning of each action handler, after authentication:

```typescript
import { checkRateLimit, cursorRateLimiters } from "./rateLimiting"

export const myAction = action({
  args: { ... },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const authUser = await ctx.runQuery(
      internal.auth.getAuthenticatedUserInternal
    )

    // 2. Check rate limit (passes the entire rate limiter config object)
    await checkRateLimit(ctx, cursorRateLimiters.myEndpoint, authUser.userId)

    // 3. Proceed with action logic
    // ...
  },
})
```

## Error Handling

When a rate limit is exceeded, the `checkRateLimit` function throws an error with a descriptive message:

```
Rate limit exceeded. Limit: {requestsPerMinute} requests per minute. 
Try again after {resetTime}
```

The error includes:
- The rate limit (requests per minute)
- The reset time (ISO timestamp) when the limit will reset

## Adjusting Rate Limits

Rate limits can be easily adjusted by modifying the `requestsPerMinute` values in `rateLimiting.ts`:

```typescript
export const cursorRateLimiters = {
  launchAgent: {
    limiter: new RateLimiter(components.rateLimiter, {
      key: "cursor:launch",
      requestsPerMinute: 10, // Adjust this value
    }),
    requestsPerMinute: 10, // Also update this value to match
  },
  // ...
}
```

## Assumptions and Design Decisions

1. **Per-User Rate Limiting**: Rate limits are applied per user (using `userId` in the rate limit key) to ensure fair usage across all users.

2. **Realistic Power User Limits**: Rate limits are based on realistic power user usage patterns - what a human could actually do, not theoretical maximums. This prevents abuse while allowing genuine power users to work efficiently.

3. **Rate Limiting Applies to All Requests**: Rate limiting is applied to prevent abuse of the endpoint itself, not just external API calls.

4. **Early Rate Limit Checks**: Rate limits are checked at the beginning of action handlers, before any expensive operations or external API calls.

5. **Clear Error Messages**: When rate limits are exceeded, users receive clear error messages with reset times to improve user experience.

## Future Considerations

1. **Tiered Rate Limits**: Consider implementing tiered rate limits based on user subscription levels or usage patterns.

2. **Burst Allowance**: Consider adding burst allowance (e.g., allow 2x the limit in the first 10 seconds) for better user experience.

3. **Rate Limit Headers**: Consider adding rate limit information to response headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) for better client-side handling.

4. **Monitoring and Analytics**: Add monitoring to track rate limit hits and adjust limits based on actual usage patterns.

5. **Global Rate Limits**: Consider adding global rate limits (across all users) in addition to per-user limits to protect against coordinated attacks.

## Testing

To test rate limiting:

1. Make rapid requests to a rate-limited endpoint
2. Verify that requests are rejected after exceeding the limit
3. Verify that the error message includes the reset time
4. Wait for the rate limit window to reset and verify requests are accepted again

## Dependencies

- `@convex-dev/rate-limiter`: Convex rate limiter component (added to `package.json`)
