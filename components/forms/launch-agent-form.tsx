"use client"

import { AlertCircle, ExternalLink, Rocket, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FieldSkeleton } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { useLaunchAgent } from "@/lib/hooks/use-agents"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { useBranches } from "@/lib/hooks/use-branches"
import { useModels } from "@/lib/hooks/use-models"
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
      model: undefined,
      target: {
        autoCreatePr: true,
        openAsCursorGithubApp: false,
        skipReviewerRequest: false,
        branchName: "",
      },
      webhook: undefined,
    },
    validators: {
      onSubmit: launchAgentFormSchema,
    },
    onSubmit: async ({ value }) => {
      // Convert to API request format (schema already validated by form validators)
      const apiRequest = formDataToApiRequest(value as LaunchAgentFormData)

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
                    {(field) => <ModelSelectField field={field} />}
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
              <Accordion>
                <AccordionItem value="webhook">
                  <AccordionTrigger iconSharedClassName="pointer-events-none shrink-0 size-6!">
                    <FieldLegend>Advanced Settings</FieldLegend>
                  </AccordionTrigger>
                  <AccordionContent>
                    <FieldSet>
                      <FieldDescription>
                        Configure a webhook to receive notifications about the
                        agent's status.
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

                        <form.AppField name="webhook.secret">
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
