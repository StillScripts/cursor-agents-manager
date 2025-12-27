import { z } from "zod"

/**
 * Schema for settings form validation
 * Validates repositories and branches configured by the user
 */

// Repository schema
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

// Branch schema
export const branchSchema = z.object({
  name: z
    .string()
    .min(1, "Branch name is required")
    .describe("Branch name (e.g., main, develop, staging)"),
  id: z.number().optional().describe("Database ID"),
})

// Settings form schema - validates items that exist, but allows empty arrays
// (the form filters out invalid/empty items before submission)
export const settingsFormSchema = z.object({
  repositories: z
    .array(repositorySchema)
    .describe("User's saved GitHub repositories"),
  branches: z.array(branchSchema).describe("User's saved branch names"),
})

// Type exports
export type RepositoryFormData = z.infer<typeof repositorySchema>
export type BranchFormData = z.infer<typeof branchSchema>
export type SettingsFormData = z.infer<typeof settingsFormSchema>

// Helper function to validate settings form data
export function validateSettingsForm(data: unknown): SettingsFormData {
  return settingsFormSchema.parse(data)
}
