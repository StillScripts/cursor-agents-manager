# Test Plan for Advanced Features

This document outlines a comprehensive test plan for the more complex components in the Convex backend, specifically focusing on Cursor actions and Webhook actions.

## Overview

The advanced features include:
1. **Cursor Actions** (`cursor.ts`) - Complex integration with Cursor API including caching and error handling
2. **Webhook Actions** (`webhookActions.ts`) - Webhook signature verification and security

## 1. Cursor Actions Test Plan

### 1.1 Testing Objectives

- Verify proper integration with Cursor API
- Test error handling when no API key is configured
- Validate caching mechanisms (ActionCache for models)
- Test error handling and fallback scenarios
- Ensure proper data transformation between API and database formats
- Verify user isolation and authentication

### 1.2 Test Scenarios

#### 1.2.1 `getAgents` Action

**Objective**: Test fetching agents list with various scenarios

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration
   - Does not make API calls

2. **With API Key**
   - Fetches from Cursor API when DB is empty
   - Returns cached DB agents when available and `forceRefresh: false`
   - Respects `limit` parameter
   - Handles `hasMore` flag correctly
   - Syncs fetched agents to database

3. **Force Refresh**
   - Bypasses DB cache when `forceRefresh: true`
   - Fetches fresh data from API
   - Updates database with new data

4. **Error Handling**
   - Falls back to DB cache on API errors
   - Returns appropriate error messages
   - Handles network failures gracefully

5. **Authentication**
   - Requires authenticated user
   - Returns empty array for unauthenticated requests

6. **Data Transformation**
   - Converts Cursor API format to database format correctly
   - Converts database format to API format correctly
   - Preserves all required fields

**Expected Outcomes**:
- Requires API key to function
- Fetches and caches data correctly
- Error handling provides clear error messages
- Data transformations maintain data integrity

#### 1.2.2 `getAgentById` Action

**Objective**: Test fetching a single agent by ID

**Scenarios to Test**:
1. **Agent in Database**
   - Returns agent from database immediately

2. **Agent Not in Database**
   - Fetches from Cursor API
   - Syncs to database
   - Returns agent data

3. **Agent Not Found (404)**
   - Returns `{ agent: null }`
   - Does not throw error

4. **No API Key**
   - Throws error requiring API key configuration

5. **Authentication**
   - Requires authenticated user
   - Returns null for unauthenticated requests

**Expected Outcomes**:
- Efficiently uses database cache when available
- Fetches from API only when necessary
- Handles missing agents gracefully

#### 1.2.3 `launchAgent` Action

**Objective**: Test launching new agents

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration

2. **Live Mode - Successful Launch**
   - Calls Cursor API with correct payload
   - Includes webhook from environment if configured
   - Saves agent to database
   - Returns agent data

3. **Request Payload Construction**
   - Handles optional fields correctly (model, target, webhook)
   - Validates required fields
   - Includes taskId if provided

4. **Error Handling**
   - Handles API errors appropriately
   - Returns meaningful error messages
   - Does not create partial records on failure

5. **Webhook Configuration**
   - Uses environment webhook if configured
   - Falls back to request webhook if provided
   - Handles webhook secret correctly

**Expected Outcomes**:
- Launches real agents via API
- Proper error handling prevents data corruption
- Requires API key to function

#### 1.2.4 `stopAgent` Action

**Objective**: Test stopping running agents

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration

2. **Successful Stop**
   - Calls Cursor API stop endpoint
   - Updates database status
   - Returns success response

3. **Agent Not Found**
   - Throws "Agent not found" error
   - Does not call API

4. **Error Handling**
   - Handles API errors
   - Provides meaningful error messages

**Expected Outcomes**:
- Updates database correctly
- Calls API appropriately
- Errors are handled gracefully

#### 1.2.5 `deleteAgent` Action

**Objective**: Test deleting agents

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration

2. **Successful Delete**
   - Calls Cursor API delete endpoint
   - Soft deletes in database
   - Returns success response

3. **Agent Not Found**
   - Throws "Agent not found" error

4. **Error Handling**
   - Handles API errors
   - Ensures database consistency

**Expected Outcomes**:
- Soft delete works correctly
- Calls API correctly
- Database remains consistent

#### 1.2.6 `sendFollowUp` Action

**Objective**: Test sending follow-up messages to agents

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration

2. **Successful Follow-up**
   - Calls Cursor API followup endpoint
   - Refreshes agent data in database
   - Returns response data

3. **Agent Not Found**
   - Throws "Agent not found" error

4. **Error Handling**
   - Handles API errors
   - Provides meaningful error messages

**Expected Outcomes**:
- Sends messages correctly
- Agent data is refreshed after follow-up
- Requires API key to function

#### 1.2.7 `getConversation` Action

**Objective**: Test fetching agent conversations

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration

2. **Successful Fetch**
   - Calls Cursor API conversation endpoint
   - Returns conversation data
   - Handles 404 (no conversation) gracefully

3. **Error Handling**
   - Handles API errors
   - Returns null conversation on 404

**Expected Outcomes**:
- Fetches real conversations
- Errors are handled appropriately
- Requires API key to function

#### 1.2.8 `getModels` Action

**Objective**: Test fetching available AI models

**Scenarios to Test**:
1. **No API Key**
   - Throws error requiring API key configuration

2. **Cached Fetch**
   - Uses ActionCache for 24-hour caching
   - Fetches from API on cache miss
   - Returns models array

3. **Cache Behavior**
   - Models are cached across users (shared cache)
   - Cache TTL is 24 hours
   - Cache key includes API key

4. **Error Handling**
   - Throws error on API failure
   - Logs errors appropriately

**Expected Outcomes**:
- Caching reduces API calls
- Requires API key to function
- Shared cache works correctly

### 1.3 Mocking Strategy

**Required Mocks**:
- `fetch` API calls to Cursor API
- ActionCache component
- Encryption/decryption functions
- Database operations (via convex-test)

**Mock Data**:
- Cursor API responses (agents, conversations, models)
- Error responses (401, 404, 429, 500)
- Network failures

### 1.4 Edge Cases

1. **Invalid API Key**
   - Decryption failures
   - Empty encrypted keys
   - Corrupted encryption data

2. **API Rate Limiting**
   - 429 responses
   - Retry logic (if implemented)

3. **Partial Data**
   - Missing optional fields
   - Null values
   - Empty arrays

4. **Concurrent Operations**
   - Multiple simultaneous requests
   - Race conditions in caching

## 2. Webhook Actions Test Plan

### 2.1 Testing Objectives

- Verify webhook signature verification
- Test security against timing attacks
- Validate signature format parsing
- Test error handling

### 2.2 Test Scenarios

#### 2.2.1 `verifyWebhookSignature` Action

**Objective**: Test webhook signature verification

**Scenarios to Test**:
1. **Valid Signature**
   - Correctly verifies valid HMAC SHA256 signature
   - Returns `{ valid: true }`
   - Uses constant-time comparison

2. **Invalid Signature Format**
   - Rejects signatures not starting with "sha256="
   - Returns appropriate error message

3. **Invalid Signature Value**
   - Rejects incorrect signatures
   - Uses timing-safe comparison
   - Returns `{ valid: false, error: "Invalid webhook signature" }`

4. **Signature Length Mismatch**
   - Handles signatures of different lengths
   - Prevents timing attacks

5. **Error Handling**
   - Handles crypto errors gracefully
   - Returns error information
   - Does not expose sensitive data

**Expected Outcomes**:
- Valid signatures are accepted
- Invalid signatures are rejected securely
- Timing attacks are prevented
- Errors are handled appropriately

### 2.3 Security Considerations

1. **Timing Attack Prevention**
   - Use `crypto.timingSafeEqual` for comparison
   - Ensure buffer lengths match before comparison

2. **Error Information**
   - Do not expose sensitive details in errors
   - Log errors for debugging

3. **Signature Format**
   - Validate format before processing
   - Handle malformed signatures safely

## 3. Implementation Notes

### 3.1 Test Infrastructure

**Required Setup**:
- Mock `fetch` for Cursor API calls
- Mock ActionCache component
- Mock encryption/decryption (or use test secrets)
- Use `convex-test` for database operations

**Test Helpers**:
- Helper functions to create mock API responses
- Helper functions to simulate different modes
- Helper functions for signature generation

### 3.2 Test Data

**Mock Cursor API Responses**:
- Agent list responses
- Agent detail responses
- Conversation responses
- Model list responses
- Error responses

**Test Webhook Signatures**:
- Valid signatures for various payloads
- Invalid signatures (wrong secret, wrong format)
- Edge cases (empty payloads, special characters)

### 3.3 Test Organization

**File Structure**:
```
convex/_tests/
├── cursor.test.ts          # Cursor actions tests
├── webhookActions.test.ts  # Webhook actions tests
└── TEST_PLAN.md            # This document
```

**Test Structure**:
- Group tests by action function
- Use descriptive test names
- Include both success and error cases
- Test error handling when API key is missing

## 4. Success Criteria

### 4.1 Coverage Goals

- **Line Coverage**: > 90% for cursor actions
- **Branch Coverage**: > 85% for cursor actions
- **Function Coverage**: 100% for webhook actions

### 4.2 Quality Goals

- All edge cases covered
- Error scenarios tested
- Security considerations validated
- Performance implications understood

## 5. Future Enhancements

### 5.1 Additional Test Scenarios

1. **Rate Limiting**
   - Test retry logic
   - Test backoff strategies

2. **Concurrent Operations**
   - Test race conditions
   - Test cache invalidation

3. **Data Migration**
   - Test schema changes
   - Test data transformation

### 5.2 Performance Testing

1. **Cache Effectiveness**
   - Measure cache hit rates
   - Test cache invalidation

2. **API Call Optimization**
   - Minimize unnecessary API calls
   - Batch operations where possible

## 6. Dependencies

### 6.1 External Dependencies

- Cursor API (mocked in tests)
- ActionCache component
- Encryption package

### 6.2 Test Dependencies

- `vitest` - Test framework
- `convex-test` - Convex testing utilities
- Mock libraries for fetch and crypto

## 7. Risk Assessment

### 7.1 High Risk Areas

1. **API Integration**
   - Network failures
   - API changes
   - Rate limiting

2. **Security**
   - Signature verification
   - Timing attacks
   - Data exposure

### 7.2 Mitigation Strategies

1. **Comprehensive Error Handling**
   - Fallback mechanisms
   - Graceful degradation

2. **Security Best Practices**
   - Constant-time comparisons
   - Input validation
   - Error message sanitization

## Conclusion

This test plan provides a comprehensive roadmap for testing the advanced features in the Convex backend. Implementation should follow the scenarios outlined above, with particular attention to security, error handling, and edge cases.
