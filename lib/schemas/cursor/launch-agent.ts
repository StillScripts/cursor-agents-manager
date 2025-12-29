import { z } from "zod"

/**
 * Comprehensive schema for the Cursor API launch agent endpoint
 * Based on: https://cursor.com/docs/cloud-agent/api/endpoints#launch-an-agent
 *
 * This schema serves as the single source of truth for both frontend and backend validation
 * when launching new agents through the Cursor API.
 */

export const promptImageSchema = z.object({
  data: z.string().describe("Base64-encoded image data"),
  dimension: z.object({
    width: z.number().positive().describe("Image width in pixels"),
    height: z.number().positive().describe("Image height in pixels"),
  }),
})

export const promptSchema = z.object({
  text: z.string().min(1).describe("The task description for the agent"),
  images: z
    .array(promptImageSchema)
    .max(5, "Maximum 5 images allowed")
    .optional()
    .describe("Optional array of images to include in the prompt"),
})

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
    .describe(
      "Git ref (branch name, tag, or commit hash) to use as the base branch"
    ),
})

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

export const modelSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    "The AI model to use for the agent. If not specified, Cursor will automatically choose the best model"
  )

export const launchAgentRequestSchema = z.object({
  prompt: promptSchema,
  source: sourceSchema,
  model: modelSchema,
  target: targetSchema.optional(),
  webhook: webhookSchema.optional(),
})

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

export type LaunchAgentRequest = z.infer<typeof launchAgentRequestSchema>
export type LaunchAgentResponse = z.infer<typeof launchAgentResponseSchema>
export type PromptImage = z.infer<typeof promptImageSchema>
export type Prompt = z.infer<typeof promptSchema>
export type Source = z.infer<typeof sourceSchema>
export type Target = z.infer<typeof targetSchema>
export type Webhook = z.infer<typeof webhookSchema>
export type Model = z.infer<typeof modelSchema>

export const launchAgentFormSchema = launchAgentRequestSchema.extend({
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

export function validateLaunchAgentRequest(data: unknown): LaunchAgentRequest {
  return launchAgentRequestSchema.parse(data)
}

export function validateLaunchAgentForm(data: unknown): LaunchAgentFormData {
  return launchAgentFormSchema.parse(data)
}

export function formDataToApiRequest(
  formData: LaunchAgentFormData
): LaunchAgentRequest {
  const request: LaunchAgentRequest = {
    prompt: formData.prompt,
    source: formData.source,
  }

  // Only include model if provided (omitting lets Cursor auto-select)
  if (formData.model) {
    request.model = formData.model
  }

  if (
    formData.target &&
    (formData.target.autoCreatePr !== undefined ||
      formData.target.openAsCursorGithubApp !== undefined ||
      formData.target.skipReviewerRequest !== undefined ||
      formData.target.branchName)
  ) {
    request.target = {
      autoCreatePr: formData.target.autoCreatePr,
      openAsCursorGithubApp: formData.target.openAsCursorGithubApp,
      skipReviewerRequest: formData.target.skipReviewerRequest,
      ...(formData.target.branchName && {
        branchName: formData.target.branchName,
      }),
    }
  }

  if (formData.webhook?.url) {
    request.webhook = formData.webhook
  }

  return request
}
