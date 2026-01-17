"use client"

import { useAction } from "convex/react"
import { AlertCircle, ExternalLink, Rocket, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  type LaunchAgentFormData,
  launchAgentFormSchema,
  type Model,
} from "validators/cursor/launch-agent"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import {
  extractErrorMessage,
  FieldSkeleton,
} from "@/components/forms/core/form-fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { ImageUpload } from "@/components/ui/image-upload"
import { api } from "@/convex/_generated/api"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { useBranches } from "@/lib/hooks/use-branches"
import { useModels } from "@/lib/hooks/use-models"
import { useOpenAIKey } from "@/lib/hooks/use-openai-key"
import { useRepositories } from "@/lib/hooks/use-repositories"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useActiveTimeLog } from "@/lib/hooks/use-time-logs"

const RepositorySelectField = ({ field }: { field: any }) => {
  const { repositories, isLoading, hasRepositories } = useRepositories()

  if (isLoading) {
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
    repositories
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
  const { branches, isLoading, hasBranches } = useBranches()

  if (isLoading) {
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
    branches
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

const ModelSelectField = ({ field }: { field: any }) => {
  const { modelsQuery, hasModels } = useModels()

  if (modelsQuery.isLoading) {
    return <FieldSkeleton label="AI Model" variant="select" />
  }

  // Always add "Auto" option at the beginning
  const autoOption = { value: "", label: "Auto (Recommended)" }
  const modelOptions = hasModels
    ? [
        autoOption,
        ...(modelsQuery.data?.map((model) => ({
          value: model,
          label: model,
        })) || []),
      ]
    : [autoOption]

  return (
    <field.ControlledSelect
      field={field}
      label="AI Model"
      description="Auto mode lets Cursor choose the best model for your task. You can also select a specific model if needed."
      placeholder="Select model..."
      options={modelOptions}
      onValueChange={(value: string) => {
        const modelValue: Model | undefined =
          value === "" || value === null ? undefined : (value as Model)
        field.handleChange(modelValue)
      }}
    />
  )
}

const TaskSelectField = ({ field }: { field: any }) => {
  const { tasks, isLoading, hasTasks } = useTasks()

  if (isLoading) {
    return <FieldSkeleton label="Task (Optional)" variant="select" />
  }

  if (!hasTasks) {
    return null // Don't show the field if user has no tasks
  }

  const taskOptions = [
    { value: "", label: "None" },
    ...(tasks?.map((task) => ({
      value: task.title,
      label: task.title,
    })) || []),
  ]

  return (
    <field.ControlledSelect
      field={field}
      label="Task (Optional)"
      description="Associate this agent with a task you are working on"
      placeholder="Select a task..."
      options={taskOptions}
      onValueChange={(value: string) => {
        const taskTitleValue: string | undefined =
          value === "" || value === null ? undefined : value
        field.handleChange(taskTitleValue)
      }}
    />
  )
}

export function LaunchAgentForm() {
  const router = useRouter()
  const launchAgentAction = useAction(api.cursor.launchAgent)
  const { hasOpenAIKey } = useOpenAIKey()
  const { activeTimeLog } = useActiveTimeLog()
  const { tasks } = useTasks()

  // Error state
  const [error, setError] = useState<Error | null>(null)

  // Find matching task for active timer
  const getDefaultTaskTitle = (): string | undefined => {
    if (!activeTimeLog || !tasks) return undefined

    // Use the task from activeTimeLog
    return activeTimeLog.task.title
  }

  // Default values for form reset
  const defaultFormValues: LaunchAgentFormData = {
    prompt: {
      text: "",
      images: [],
    },
    source: {
      repository: "",
      ref: "",
    },
    model: undefined,
    target: {
      autoCreatePr: true,
      openAsCursorGithubApp: false,
      skipReviewerRequest: false,
      branchName: "",
    },
    taskId: getDefaultTaskTitle(),
    recurringJob: {
      enabled: false,
      intervalDays: undefined,
      repeatCount: undefined,
    },
  }

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<LaunchAgentFormData>({
    defaultValues: defaultFormValues,
    validators: {
      onSubmit: launchAgentFormSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const actualTaskId = tasks?.find((t) => t.title === value.taskId)?._id

        // Explicitly construct the payload to ensure all fields are included
        const payload = {
          prompt: {
            text: value.prompt.text,
            // Explicitly include images array (even if empty)
            images: value.prompt.images || [],
          },
          source: {
            repository: value.source.repository,
            ref: value.source.ref,
          },
          model: value.model,
          target: value.target
            ? {
                autoCreatePr: value.target.autoCreatePr ?? false,
                openAsCursorGithubApp:
                  value.target.openAsCursorGithubApp ?? false,
                skipReviewerRequest: value.target.skipReviewerRequest ?? false,
                ...(value.target.branchName && {
                  branchName: value.target.branchName,
                }),
              }
            : undefined,
          taskId: actualTaskId,
          ...(value.recurringJob?.enabled &&
            value.recurringJob.intervalDays !== undefined &&
            value.recurringJob.repeatCount !== undefined && {
              recurringJob: {
                enabled: true,
                intervalDays: value.recurringJob.intervalDays,
                repeatCount: value.recurringJob.repeatCount,
              },
            }),
        }

        // Launch the agent via Convex action
        await launchAgentAction(payload)

        // Reset form to default values before navigation
        // This ensures that when the user navigates back (especially in PWA),
        // the form is clean and doesn't show previous submission data
        form.reset(defaultFormValues)

        router.push("/agents")
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to launch agent")
        )
        // Error is set, form submission will be re-enabled by TanStack Form
      }
    },
  })

  const errorMessage = error?.message ?? null
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
                    {(field) =>
                      hasOpenAIKey ? (
                        <field.ControlledTextareaWithVoice
                          field={field}
                          label="Task Description"
                          description="Describe the task you want the agent to perform (10-5000 characters)"
                          placeholder="Add a README.md file with installation instructions..."
                          className="min-h-[120px]"
                          onBranchNameRecommended={(branchName) => {
                            // Auto-populate the recommended branch name
                            form.setFieldValue("target.branchName", branchName)
                          }}
                        />
                      ) : (
                        <field.ControlledTextarea
                          field={field}
                          label="Task Description"
                          description="Describe the task you want the agent to perform (10-5000 characters)"
                          placeholder="Add a README.md file with installation instructions..."
                          className="min-h-[120px]"
                        />
                      )
                    }
                  </form.AppField>

                  <form.AppField name="prompt.images">
                    {(field) => (
                      <ImageUpload
                        value={field.state.value || []}
                        onChange={(images) => field.handleChange(images)}
                        onBlur={field.handleBlur}
                        label="Images (Optional)"
                        description="Upload up to 5 images to include with your task description"
                        error={
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                            ? field.state.meta.errors
                                .map(extractErrorMessage)
                                .filter((msg): msg is string => Boolean(msg))
                                .join(", ")
                            : undefined
                        }
                        maxImages={5}
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
                    {(field) => <ModelSelectField field={field} />}
                  </form.AppField>
                  <form.AppField name="taskId">
                    {(field) => <TaskSelectField field={field} />}
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
                  <form.AppField name="target.branchName">
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
                <FieldLegend>Recurring Job</FieldLegend>
                <FieldDescription>
                  Schedule this agent to run automatically at regular intervals.
                </FieldDescription>
                <FieldGroup>
                  <form.AppField name="recurringJob.enabled">
                    {(field) => (
                      <field.ControlledSwitch
                        field={field}
                        label="Create Recurring Job"
                        description="Enable to automatically run this agent on a schedule"
                      />
                    )}
                  </form.AppField>

                  {form.useFieldValue("recurringJob.enabled") && (
                    <>
                      <form.AppField name="recurringJob.intervalDays">
                        {(field) => (
                          <field.ControlledInput
                            field={field}
                            type="number"
                            label="Interval (Days)"
                            description="How many days between each execution"
                            placeholder="7"
                            min={1}
                            max={365}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = e.currentTarget.value
                              field.handleChange(
                                value === "" ? undefined : Number.parseInt(value, 10)
                              )
                            }}
                            value={field.state.value?.toString() || ""}
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="recurringJob.repeatCount">
                        {(field) => (
                          <field.ControlledInput
                            field={field}
                            type="number"
                            label="Repeat Count"
                            description="Total number of times to run (including the initial execution)"
                            placeholder="5"
                            min={1}
                            max={100}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = e.currentTarget.value
                              field.handleChange(
                                value === "" ? undefined : Number.parseInt(value, 10)
                              )
                            }}
                            value={field.state.value?.toString() || ""}
                          />
                        )}
                      </form.AppField>
                    </>
                  )}
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
            {error && errorMessage && (
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
