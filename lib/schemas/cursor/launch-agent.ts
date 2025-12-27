import { z } from "zod"

/**
 * Comprehensive schema for the Cursor API launch agent endpoint
 * Based on: https://cursor.com/docs/cloud-agent/api/endpoints#launch-an-agent
 *
 * This schema serves as the single source of truth for both frontend and backend validation
 * when launching new agents through the Cursor API.
 */

// Image schema for prompt images
export const promptImageSchema = z.object({
  data: z.string().describe("Base64-encoded image data"),
  dimension: z.object({
    width: z.number().positive().describe("Image width in pixels"),
    height: z.number().positive().describe("Image height in pixels"),
  }),
})

// Prompt schema supporting text and optional images
export const promptSchema = z.object({
  text: z.string().min(1).describe("The task description for the agent"),
  images: z
    .array(promptImageSchema)
    .optional()
    .describe("Optional array of images to include in the prompt"),
})

// Source repository configuration
export const sourceSchema = z.object({
  repository: z
    .string()
    .url()
    .refine(
      (url) => url.includes("github.com"),
      "Must be a valid GitHub repository URL"
    )
    .describe("GitHub repository URL (e.g., https://github.com/owner/repo)"),
  ref: z
    .string()
    .min(1)
    .default("main")
    .describe(
      "Git ref (branch name, tag, or commit hash) to use as the base branch"
    ),
})

// Webhook configuration for status notifications
export const webhookSchema = z.object({
  url: z
    .string()
    .url()
    .describe(
      "URL to receive webhook notifications about agent status changes"
    ),
  secret: z
    .string()
    .min(32)
    .optional()
    .describe(
      "Secret key for webhook payload verification (minimum 32 characters)"
    ),
})

// Target configuration for the agent
export const targetSchema = z.object({
  autoCreatePr: z
    .boolean()
    .default(false)
    .describe(
      "Whether to automatically create a pull request when the agent completes"
    ),
  openAsCursorGithubApp: z
    .boolean()
    .default(false)
    .describe(
      "Whether to open the pull request as the Cursor GitHub App instead of as the user. Only applies if autoCreatePr is true"
    ),
  skipReviewerRequest: z
    .boolean()
    .default(false)
    .describe(
      "Whether to skip adding the user as a reviewer to the pull request. Only applies if autoCreatePr is true and the PR is opened as the Cursor GitHub App"
    ),
  branchName: z
    .string()
    .optional()
    .describe(
      "Custom branch name for the agent to create. If not provided, a name will be auto-generated"
    ),
})

// Available models for the agent
export const availableModels = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "o1-preview",
  "o1-mini",
] as const

export const modelSchema = z
  .enum(availableModels)
  .optional()
  .describe(
    "The AI model to use for the agent. If not specified, Cursor will automatically choose the best model"
  )

// Main launch agent request schema
export const launchAgentRequestSchema = z.object({
  prompt: promptSchema,
  source: sourceSchema,
  model: modelSchema.optional(),
  target: targetSchema.optional(),
  webhook: webhookSchema.optional(),
})

// Response schema for launched agent
export const launchAgentResponseSchema = z.object({
  id: z.string().describe("Unique identifier for the launched agent"),
  name: z.string().describe("Display name for the agent"),
  status: z
    .enum(["CREATING", "RUNNING", "FINISHED", "ERROR", "EXPIRED"])
    .describe("Current status of the agent"),
  source: sourceSchema,
  target: z.object({
    branchName: z.string().optional(),
    url: z.string().url(),
    autoCreatePr: z.boolean(),
    openAsCursorGithubApp: z.boolean().optional(),
    skipReviewerRequest: z.boolean().optional(),
    prUrl: z.string().url().optional(),
  }),
  createdAt: z
    .string()
    .datetime()
    .describe("ISO timestamp when the agent was created"),
  summary: z
    .string()
    .optional()
    .describe("Summary of what the agent accomplished"),
})

// Type exports for use throughout the application
export type LaunchAgentRequest = z.infer<typeof launchAgentRequestSchema>
export type LaunchAgentResponse = z.infer<typeof launchAgentResponseSchema>
export type PromptImage = z.infer<typeof promptImageSchema>
export type Prompt = z.infer<typeof promptSchema>
export type Source = z.infer<typeof sourceSchema>
export type Target = z.infer<typeof targetSchema>
export type Webhook = z.infer<typeof webhookSchema>
export type Model = z.infer<typeof modelSchema>

// Form-specific schema with additional validation for the UI
export const launchAgentFormSchema = launchAgentRequestSchema.extend({
  // Additional form-specific validations can be added here
  prompt: promptSchema.extend({
    text: z
      .string()
      .min(
        10,
        "Please provide a more detailed task description (at least 10 characters)"
      )
      .max(5000, "Task description is too long (maximum 5000 characters)"),
  }),
  source: sourceSchema.extend({
    repository: z
      .string()
      .url("Please enter a valid URL")
      .refine((url) => {
        try {
          const parsed = new URL(url)
          return (
            parsed.hostname === "github.com" &&
            parsed.pathname.split("/").length >= 3
          )
        } catch {
          return false
        }
      }, "Must be a valid GitHub repository URL (e.g., https://github.com/owner/repo)"),
    ref: z
      .string()
      .min(1, "Base branch is required")
      .max(100, "Branch name is too long"),
  }),
  target: targetSchema.extend({
    branchName: z
      .string()
      .optional()
      .refine(
        (name) => !name || /^[a-zA-Z0-9/_-]+$/.test(name),
        "Branch name can only contain letters, numbers, hyphens, underscores, and forward slashes"
      ),
  }),
})

export type LaunchAgentFormData = z.infer<typeof launchAgentFormSchema>

// Helper function to validate launch agent requests
export function validateLaunchAgentRequest(data: unknown): LaunchAgentRequest {
  return launchAgentRequestSchema.parse(data)
}

// Helper function to validate form data
export function validateLaunchAgentForm(data: unknown): LaunchAgentFormData {
  return launchAgentFormSchema.parse(data)
}

// Helper function to convert form data to API request
export function formDataToApiRequest(
  formData: LaunchAgentFormData
): LaunchAgentRequest {
  const request: LaunchAgentRequest = {
    prompt: formData.prompt,
    source: formData.source,
  }

  // Only include optional fields if they have values
  if (formData.model && formData.model !== "") {
    request.model = formData.model
  }

  if (
    formData.target &&
    (formData.target.autoCreatePr !== undefined ||
      formData.target.openAsCursorGithubApp !== undefined ||
      formData.target.skipReviewerRequest !== undefined ||
      formData.target.branchName)
  ) {
    request.target = formData.target
  }

  if (formData.webhook?.url) {
    request.webhook = formData.webhook
  }

  return request
}

// Default form values
export const defaultFormValues: Partial<LaunchAgentFormData> = {
  prompt: {
    text: "",
  },
  source: {
    repository: "",
    ref: "main",
  },
  model: undefined, // Auto mode - let Cursor choose
  target: {
    autoCreatePr: true,
    openAsCursorGithubApp: false,
    skipReviewerRequest: false,
    branchName: "",
  },
}
