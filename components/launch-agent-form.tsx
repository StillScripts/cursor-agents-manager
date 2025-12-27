"use client"

import { AlertCircle, ExternalLink, Rocket } from "lucide-react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { useLaunchAgent } from "@/lib/hooks/use-agents"
import { useAppForm } from "@/lib/hooks/use-app-form"
import { useBranches } from "@/lib/hooks/use-branches"
import { useRepositories } from "@/lib/hooks/use-repositories"
import {
  formDataToApiRequest,
  type LaunchAgentFormData,
  launchAgentFormSchema,
  type Model,
} from "@/lib/schemas/cursor/launch-agent"
import { PageHeader } from "./page-header"

const modelOptions = [
  { value: "", label: "Auto (Recommended)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Latest)" },
  { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet (June)" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "o1-preview", label: "o1 Preview" },
  { value: "o1-mini", label: "o1 Mini" },
] as const

export function LaunchAgentForm() {
  const router = useRouter()
  const launchAgent = useLaunchAgent()
  const { repositories, isLoaded } = useRepositories()
  const { branches, isLoaded: branchesLoaded } = useBranches()

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<LaunchAgentFormData>({
    defaultValues: {
      prompt: {
        text: "",
        images: [],
      },
      source: {
        repository: "",
        ref: "main",
      },
      model: undefined,
      target: {
        autoCreatePr: true,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
        branchName: "",
      },
      webhook: undefined,
    },
    onSubmit: async ({ value }) => {
      // Validate form data
      const validatedData = launchAgentFormSchema.parse(value)

      // Convert to API request format
      const apiRequest = formDataToApiRequest(validatedData)

      await launchAgent.mutateAsync(apiRequest)
      router.push("/")
    },
  })

  const hasRepositories =
    repositories.length > 0 && repositories.some((r) => r.url.trim())
  const hasBranches = branches.length > 0 && branches.some((b) => b.name.trim())

  const errorMessage =
    launchAgent.error instanceof Error ? launchAgent.error.message : null
  const isGitHubAccessError = errorMessage?.includes(
    "lack access to repository"
  )

  return (
    <>
      <PageHeader title="Launch Agent" />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="p-4"
      >
        <FieldGroup className="gap-6">
          <FieldSet>
            <FieldLegend>Task Description</FieldLegend>
            <FieldDescription>
              Describe what you want the agent to do
            </FieldDescription>
            <FieldGroup>
              <form.AppField
                name="prompt.text"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Please describe the task"
                      : value.length < 10
                        ? "Please provide a more detailed task description (at least 10 characters)"
                        : value.length > 5000
                          ? "Task description is too long (maximum 5000 characters)"
                          : undefined,
                }}
              >
                {(field) => (
                  <field.ControlledTextarea
                    field={field}
                    label="Task Description"
                    description="Describe the task you want the agent to perform (10-5000 characters)"
                    placeholder="Add a README.md file with installation instructions..."
                    className="min-h-[120px]"
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Repository</FieldLegend>
            <FieldDescription>
              The GitHub repository for the agent to work on
            </FieldDescription>
            <FieldGroup>
              <form.AppField
                name="source.repository"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return "Repository is required"
                    try {
                      const url = new URL(value)
                      if (url.hostname !== "github.com") {
                        return "Must be a valid GitHub repository URL"
                      }
                      if (url.pathname.split("/").length < 3) {
                        return "Must be a valid GitHub repository URL (e.g., https://github.com/owner/repo)"
                      }
                      return undefined
                    } catch {
                      return "Please enter a valid URL"
                    }
                  },
                }}
              >
                {(field) =>
                  isLoaded && hasRepositories ? (
                    <field.ControlledSelect
                      field={field}
                      label="Repository"
                      description="Manage repositories in Settings"
                      options={repositories
                        .filter((r) => r.url.trim())
                        .map((repo) => ({
                          value: repo.url,
                          label: repo.name,
                        }))}
                    />
                  ) : (
                    <field.ControlledInput
                      field={field}
                      label="Repository"
                      description="Add repositories in Settings for quick access"
                      placeholder="https://github.com/your-org/your-repo"
                    />
                  )
                }
              </form.AppField>

              <form.AppField
                name="source.ref"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Base branch is required"
                      : value.length > 100
                        ? "Branch name is too long"
                        : undefined,
                }}
              >
                {(field) =>
                  isLoaded && branchesLoaded && hasBranches ? (
                    <field.ControlledSelect
                      field={field}
                      label="Base Branch"
                      description="Manage branches in Settings"
                      options={branches
                        .filter((b) => b.name.trim())
                        .map((branch) => ({
                          value: branch.name,
                          label: branch.name,
                        }))}
                    />
                  ) : (
                    <field.ControlledInput
                      field={field}
                      label="Base Branch"
                      description="The branch to base changes on (branch name, tag, or commit hash)"
                      placeholder="main"
                    />
                  )
                }
              </form.AppField>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Model Configuration</FieldLegend>
            <FieldDescription>
              Choose the AI model for your agent
            </FieldDescription>
            <FieldGroup>
              <form.AppField name="model">
                {(field) => (
                  <field.ControlledSelect
                    field={field}
                    label="AI Model"
                    description="Auto mode lets Cursor choose the best model for your task. You can also select a specific model if needed."
                    options={modelOptions.map((model) => ({
                      value: model.value,
                      label: model.label,
                    }))}
                    onValueChange={(value) => {
                      const modelValue: Model | undefined =
                        value === "" || value === null
                          ? undefined
                          : (value as Model)
                      field.handleChange(modelValue)
                    }}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Target Configuration</FieldLegend>
            <FieldDescription>
              Configure where and how the agent makes changes
            </FieldDescription>
            <FieldGroup>
              <form.AppField
                name="target.branchName"
                validators={{
                  onChange: ({ value }) =>
                    value && !/^[a-zA-Z0-9/_-]+$/.test(value)
                      ? "Branch name can only contain letters, numbers, hyphens, underscores, and forward slashes"
                      : undefined,
                }}
              >
                {(field) => (
                  <field.ControlledInput
                    field={field}
                    label="Target Branch (optional)"
                    description="Custom branch name for the agent to create. Leave empty to auto-generate."
                    placeholder="feature/my-feature"
                  />
                )}
              </form.AppField>

              <form.AppField name="target.autoCreatePr">
                {(field) => (
                  <field.ControlledSwitch
                    field={field}
                    label="Auto-create Pull Request"
                    description="Automatically create a PR when the agent completes"
                  />
                )}
              </form.AppField>

              <form.AppField name="target.openAsCursorGithubApp">
                {(field) => (
                  <field.ControlledSwitch
                    field={field}
                    label="Open PR as Cursor GitHub App"
                    description="Open the pull request as the Cursor GitHub App instead of as your user account (only applies if auto-create PR is enabled)"
                  />
                )}
              </form.AppField>

              <form.AppField name="target.skipReviewerRequest">
                {(field) => (
                  <field.ControlledSwitch
                    field={field}
                    label="Skip Adding Reviewer"
                    description="Skip adding you as a reviewer to the pull request (only applies if auto-create PR is enabled and PR is opened as Cursor GitHub App)"
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Webhook Configuration (Optional)</FieldLegend>
            <FieldDescription>
              Get notified about agent status changes
            </FieldDescription>
            <FieldGroup>
              <form.AppField name="webhook.url">
                {(field) => (
                  <field.ControlledInput
                    field={field}
                    label="Webhook URL"
                    description="URL to receive webhook notifications about agent status changes"
                    placeholder="https://your-app.com/webhooks/cursor"
                  />
                )}
              </form.AppField>

              <form.AppField
                name="webhook.secret"
                validators={{
                  onChange: ({ value }) =>
                    value && value.length < 32
                      ? "Webhook secret must be at least 32 characters long"
                      : undefined,
                }}
              >
                {(field) => (
                  <field.ControlledInput
                    field={field}
                    label="Webhook Secret (Optional)"
                    description="Secret key for webhook payload verification (minimum 32 characters)"
                    type="password"
                    placeholder="Your webhook secret (min 32 characters)"
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        {launchAgent.isError && errorMessage && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to launch agent</AlertTitle>
            <AlertDescription className="mt-2">
              {isGitHubAccessError ? (
                <div className="space-y-2">
                  <p>The Cursor GitHub App needs access to your repository.</p>
                  <p className="text-sm">
                    <strong>To fix this:</strong>
                  </p>
                  <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                    <li>
                      Go to{" "}
                      <a
                        href="https://cursor.com/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-1"
                      >
                        Cursor Settings
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Navigate to GitHub App / Integrations</li>
                    <li>Install or configure the Cursor GitHub App</li>
                    <li>Grant access to your repository</li>
                  </ol>
                </div>
              ) : (
                <p>{errorMessage}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-8">
          <form.SubscribeButton
            formId={form.formId}
            label="Launch Agent"
            icon={<Rocket className="h-5 w-5" />}
            className="w-full h-12 text-base"
          />
        </div>
      </form>
    </>
  )
}
