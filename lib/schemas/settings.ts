import { z } from "zod"

// ============================================================================
// API Key Schema
// ============================================================================

export const apiKeySchema = z.object({
  apiKey: z
    .string()
    .min(10, "API key must be at least 10 characters")
    .describe("Cursor API key"),
})

export type ApiKeyFormData = z.infer<typeof apiKeySchema>

// ============================================================================
// Repository Schema
// ============================================================================

export const repositorySchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Please enter a valid URL")
    .refine((url) => url.includes("github.com"), "Must be a GitHub URL")
    .describe("GitHub repository URL (e.g., https://github.com/owner/repo)"),
  name: z
    .string()
    .min(1, "Name is required")
    .describe("Repository display name"),
  id: z.number().optional().describe("Database ID"),
})

// ============================================================================
// Branch Schema
// ============================================================================

export const branchSchema = z.object({
  name: z
    .string()
    .min(1, "Branch name is required")
    .describe("Branch name (e.g., main, develop, staging)"),
  id: z.number().optional().describe("Database ID"),
})

export type BranchFormData = z.infer<typeof branchSchema>

// ============================================================================
// Request Body Schemas (for API routes)
// ============================================================================

export const repositoriesRequestSchema = z.object({
  repositories: z.array(repositorySchema),
})

export const branchesRequestSchema = z.object({
  branches: z.array(branchSchema),
})

// ============================================================================
// Settings Form Schema
// ============================================================================

export const settingsFormSchema = z.object({
  repositories: z
    .array(repositorySchema)
    .describe("User's saved GitHub repositories"),
  branches: z.array(branchSchema).describe("User's saved branch names"),
})

export type RepositoryFormData = z.infer<typeof repositorySchema>
export type SettingsFormData = z.infer<typeof settingsFormSchema>

export function validateSettingsForm(data: unknown): SettingsFormData {
  return settingsFormSchema.parse(data)
}
