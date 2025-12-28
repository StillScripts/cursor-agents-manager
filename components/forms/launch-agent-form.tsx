"use client"

import { AlertCircle, ExternalLink, Rocket, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FieldSkeleton } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { CURSOR_MODEL_AUTO_VALUE, CURSOR_MODEL_OPTIONS } from "@/lib/constants"
import { useLaunchAgent } from "@/lib/hooks/use-agents"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { useBranches } from "@/lib/hooks/use-branches"
import { useRepositories } from "@/lib/hooks/use-repositories"
import {
  formDataToApiRequest,
  type LaunchAgentFormData,
  launchAgentFormSchema,
  type Model,
} from "@/lib/schemas/cursor/launch-agent"

const RepositorySelectField = ({ field }: { field: any }) => {
  const { repositoriesQuery, hasRepositories } = useRepositories()

  if (repositoriesQuery.isLoading) {
    return <FieldSkeleton label="Repository" variant="select" />
  }

  if (!hasRepositories) {
    return (
      <FieldGroup>
        <field.ControlledSelect
          field={field}
          label="Repository"
          description="You need to add repositories in Settings to be able to select them"
          placeholder="Select repository..."
          options={[]}
          disabled
        />
        <Link
          href="/settings"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <Settings className="h-3 w-3" />
          Add repositories in Settings for quick access
        </Link>
      </FieldGroup>
    )
  }

  const options =
    repositoriesQuery.data
      ?.filter((r) => r.url.trim())
      .map((r) => ({
        value: r.url,
        label: r.name,
      })) || []

  return (
    <field.ControlledSelect
      field={field}
      label="Repository"
      placeholder="Select repository..."
      options={options}
    />
  )
}

const BranchSelectField = ({ field }: { field: any }) => {
  const { branchesQuery, hasBranches } = useBranches()

  if (branchesQuery.isLoading) {
    return <FieldSkeleton label="Base Branch" variant="select" />
  }

  if (!hasBranches) {
    return (
      <FieldGroup>
        <field.ControlledSelect
          field={field}
          label="Base Branch"
          description="You need to add branches in Settings to be able to select them"
          placeholder="Select branch..."
          options={[]}
          disabled
        />
        <Link
          href="/settings"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <Settings className="h-3 w-3" />
          Add branches in Settings for quick access
        </Link>
      </FieldGroup>
    )
  }

  const options =
    branchesQuery.data
      ?.filter((b) => b.name.trim())
      .map((b) => ({
        value: b.name,
        label: b.name,
      })) || []

  return (
    <field.ControlledSelect
      field={field}
      label="Base Branch"
      placeholder="Select branch..."
      options={options}
    />
  )
}

export function LaunchAgentForm() {
  const router = useRouter()
  const launchAgent = useLaunchAgent()

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<LaunchAgentFormData>({
    defaultValues: {
      prompt: {
        text: "",
        images: [],
      },
      source: {
        repository: "",
        ref: "",
      },
      model: CURSOR_MODEL_AUTO_VALUE,
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

  const errorMessage =
    launchAgent.error instanceof Error ? launchAgent.error.message : null
  const isGitHubAccessError = errorMessage?.includes(
    "lack access to repository"
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title="Launch Agent" />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <FormProvider value={form}>
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="p-4 overflow-hidden"
          >
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Task Details</FieldLegend>
                <FieldDescription>
                  Describe the task, and select the project and base branch.
                </FieldDescription>
                <FieldGroup>
                  <form.AppField name="prompt.text">
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

                  <form.AppField name="source.repository">
                    {(field) => <RepositorySelectField field={field} />}
                  </form.AppField>

                  <form.AppField name="source.ref">
                    {(field) => <BranchSelectField field={field} />}
                  </form.AppField>
                  <form.AppField name="model">
                    {(field) => (
                      <field.ControlledSelect
                        field={field}
                        label="AI Model"
                        description="Auto mode lets Cursor choose the best model for your task. You can also select a specific model if needed."
                        placeholder="Select model..."
                        options={Array.from(CURSOR_MODEL_OPTIONS)}
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

              <FieldSeparator />

              <FieldSet>
                <FieldLegend>GitHub Settings</FieldLegend>
                <FieldDescription>
                  Manage the branch name used for this task, and the settings
                  related to GitHub.
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
              <FieldSeparator />
              <FieldSet>
                <FieldLegend>Webhook Settings</FieldLegend>
                <FieldDescription>
                  Configure a webhook to receive notifications about the agent's
                  status.
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
                      <p>
                        The Cursor GitHub App needs access to your repository.
                      </p>
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
        </FormProvider>
      </div>
    </div>
  )
}
