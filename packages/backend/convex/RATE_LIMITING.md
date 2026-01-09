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

Rate limits for Cursor API endpoints are set conservatively to prevent abuse while allowing reasonable usage:

| Endpoint | Rate Limit (RPM) | Rationale |
|----------|------------------|-----------|
| `launchAgent` | 10 | Expensive operation that creates new agents |
| `getAgents` | 30 | Listing operations, less expensive |
| `getAgentById` | 30 | Single agent fetch |
| `getConversation` | 60 | Reading conversation data |
| `getConversationWithCursor` | 60 | Reading conversation data with pagination |
| `sendFollowUp` | 20 | Modifying agent state |
| `stopAgent` | 20 | Modifying agent state |
| `deleteAgent` | 10 | Destructive operation |
| `getModels` | 30 | Cached, but still needs rate limiting |

### OpenAI API Endpoints

Rate limits for OpenAI API endpoints are set conservatively to prevent abuse while allowing reasonable usage:

| Endpoint | Rate Limit (RPM) | Rationale |
|----------|------------------|-----------|
| `summarizeConversation` | 15 | Expensive GPT-4 operation |
| `transcribeAudio` | 30 | Whisper API, moderate cost |
| `textToSpeech` | 30 | TTS API, moderate cost |
| `improvePrompt` | 30 | GPT-4 operation, but shorter prompts |

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

2. **Conservative Limits**: Rate limits are set stricter than average usage patterns to prevent abuse while still allowing power users reasonable access.

3. **Rate Limiting Applies to All Modes**: Rate limiting is applied even in simulation mode to prevent abuse of the endpoint itself, not just external API calls.

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
