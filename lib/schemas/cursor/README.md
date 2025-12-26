# Cursor API Schemas

This directory contains comprehensive schemas for the Cursor API endpoints, providing type-safe validation for both frontend and backend.

## Launch Agent Schema

The `launch-agent.ts` file contains the complete schema for the Cursor API's launch agent endpoint, supporting all available options:

### Core Features

- **Comprehensive Validation**: Covers all Cursor API launch agent parameters
- **Type Safety**: Full TypeScript support with inferred types
- **Single Source of Truth**: Used for both frontend forms and backend API validation
- **Form Validation**: Enhanced validation rules for UI forms
- **Backwards Compatibility**: Re-exports types to maintain existing imports

### Available Options

#### Prompt Configuration
- `text`: Task description (10-5000 characters)
- `images`: Optional array of base64-encoded images with dimensions

#### Source Repository
- `repository`: GitHub repository URL (validated format)
- `ref`: Git reference (branch, tag, or commit hash)

#### Model Selection
Supports all available Cursor AI models:
- Claude 3.5 Sonnet (latest and June versions)
- Claude 3.5 Haiku
- Claude 3 Opus/Sonnet/Haiku
- GPT-4o/4o-mini/4-turbo/4/3.5-turbo
- o1 Preview/Mini

#### Target Configuration
- `autoCreatePr`: Auto-create pull request when complete
- `openAsCursorGithubApp`: Open PR as Cursor GitHub App vs user account
- `skipReviewerRequest`: Skip adding user as reviewer
- `branchName`: Custom branch name (optional, auto-generated if not provided)

#### Webhook Notifications
- `url`: Webhook endpoint for status change notifications
- `secret`: Optional secret for payload verification (min 32 chars)

### Usage Examples

```typescript
import { 
  validateLaunchAgentRequest,
  validateLaunchAgentForm,
  formDataToApiRequest,
  type LaunchAgentFormData 
} from '@/lib/schemas/cursor/launch-agent';

// Validate API request
const apiRequest = validateLaunchAgentRequest(requestBody);

// Validate form data
const formData = validateLaunchAgentForm(userInput);

// Convert form to API request
const apiRequest = formDataToApiRequest(formData);
```

### Form Integration

The schema is integrated with the launch agent form (`/components/launch-agent-form.tsx`) to provide:

1. **Real-time Validation**: Field-level validation with user-friendly error messages
2. **Type Safety**: Full TypeScript support for form fields
3. **Enhanced UX**: Conditional field visibility and smart defaults
4. **Repository/Branch Management**: Integration with saved repositories and branches

### API Integration

The schema is used in the API route (`/app/api/agents/route.ts`) to:

1. **Validate Requests**: Ensure all incoming requests match the expected format
2. **Type Safety**: Provide compile-time guarantees about request structure
3. **Error Handling**: Return detailed validation errors for debugging
4. **Consistency**: Ensure the same validation rules apply everywhere

### Testing

Comprehensive tests are included in `__tests__/launch-agent.test.ts` using Bun's built-in test runner, covering:

- Valid minimal requests
- Complete requests with all options
- Invalid repository URLs
- Webhook validation
- Form-to-API conversion
- Edge cases and error conditions

Run tests with:
```bash
bun test                    # Run all tests
bun test --watch           # Run tests in watch mode
bun test lib/schemas/      # Run schema tests specifically
```