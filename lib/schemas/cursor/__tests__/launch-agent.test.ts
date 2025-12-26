import { describe, it, expect } from '@jest/globals';
import {
  validateLaunchAgentRequest,
  validateLaunchAgentForm,
  formDataToApiRequest,
  launchAgentFormSchema,
  type LaunchAgentFormData,
} from '../launch-agent';

describe('Launch Agent Schema', () => {
  it('should validate a minimal valid request', () => {
    const validRequest = {
      prompt: {
        text: 'Add a README file',
      },
      source: {
        repository: 'https://github.com/user/repo',
        ref: 'main',
      },
    };

    expect(() => validateLaunchAgentRequest(validRequest)).not.toThrow();
  });

  it('should validate a complete request with all options', () => {
    const completeRequest = {
      prompt: {
        text: 'Add comprehensive documentation',
        images: [
          {
            data: 'base64encodeddata',
            dimension: { width: 1024, height: 768 },
          },
        ],
      },
      source: {
        repository: 'https://github.com/user/repo',
        ref: 'main',
      },
      model: 'claude-3-5-sonnet-20241022',
      target: {
        autoCreatePr: true,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
        branchName: 'feature/docs',
      },
      webhook: {
        url: 'https://example.com/webhook',
        secret: 'a'.repeat(32), // 32 character secret
      },
    };

    expect(() => validateLaunchAgentRequest(completeRequest)).not.toThrow();
  });

  it('should reject invalid repository URLs', () => {
    const invalidRequest = {
      prompt: { text: 'Test task' },
      source: {
        repository: 'not-a-url',
        ref: 'main',
      },
    };

    expect(() => validateLaunchAgentRequest(invalidRequest)).toThrow();
  });

  it('should reject non-GitHub repository URLs', () => {
    const invalidRequest = {
      prompt: { text: 'Test task' },
      source: {
        repository: 'https://gitlab.com/user/repo',
        ref: 'main',
      },
    };

    expect(() => validateLaunchAgentRequest(invalidRequest)).toThrow();
  });

  it('should reject webhook secrets that are too short', () => {
    const invalidRequest = {
      prompt: { text: 'Test task' },
      source: {
        repository: 'https://github.com/user/repo',
        ref: 'main',
      },
      webhook: {
        url: 'https://example.com/webhook',
        secret: 'tooshort',
      },
    };

    expect(() => validateLaunchAgentRequest(invalidRequest)).toThrow();
  });

  it('should convert form data to API request correctly', () => {
    const formData: LaunchAgentFormData = {
      prompt: {
        text: 'Test task',
      },
      source: {
        repository: 'https://github.com/user/repo',
        ref: 'main',
      },
      model: 'claude-3-5-sonnet-20241022',
      target: {
        autoCreatePr: true,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
        branchName: 'feature/test',
      },
      webhook: {
        url: 'https://example.com/webhook',
      },
    };

    const apiRequest = formDataToApiRequest(formData);

    expect(apiRequest).toEqual({
      prompt: formData.prompt,
      source: formData.source,
      model: formData.model,
      target: formData.target,
      webhook: formData.webhook,
    });
  });

  it('should omit undefined webhook from API request', () => {
    const formData: LaunchAgentFormData = {
      prompt: {
        text: 'Test task',
      },
      source: {
        repository: 'https://github.com/user/repo',
        ref: 'main',
      },
      model: 'claude-3-5-sonnet-20241022',
      target: {
        autoCreatePr: true,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
      },
    };

    const apiRequest = formDataToApiRequest(formData);

    expect(apiRequest.webhook).toBeUndefined();
    expect(apiRequest).toEqual({
      prompt: formData.prompt,
      source: formData.source,
      model: formData.model,
      target: formData.target,
    });
  });
});