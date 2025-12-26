"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useLaunchAgent } from "@/lib/hooks/use-agents";
import { useRepositories } from "@/lib/hooks/use-repositories";
import { useBranches } from "@/lib/hooks/use-branches";
import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldContent,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Rocket, Settings, AlertCircle, ExternalLink, Plus, X } from "lucide-react";
import Link from "next/link";
import {
  type LaunchAgentFormData,
  launchAgentFormSchema,
  defaultFormValues,
  availableModels,
  formDataToApiRequest,
} from "@/lib/schemas/cursor/launch-agent";

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
] as const;

export function LaunchAgentForm() {
  const router = useRouter();
  const launchAgent = useLaunchAgent();
  const { repositories, isLoaded } = useRepositories();
  const { branches, isLoaded: branchesLoaded } = useBranches();

  const form = useForm<LaunchAgentFormData>({
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
      const validatedData = launchAgentFormSchema.parse(value);
      
      // Convert to API request format
      const apiRequest = formDataToApiRequest(validatedData);
      
      await launchAgent.mutateAsync(apiRequest);
      router.push("/");
    },
  });

  const hasRepositories =
    repositories.length > 0 && repositories.some((r) => r.url.trim());
  const hasBranches =
    branches.length > 0 && branches.some((b) => b.name.trim());

  const errorMessage =
    launchAgent.error instanceof Error ? launchAgent.error.message : null;
  const isGitHubAccessError = errorMessage?.includes(
    "lack access to repository"
  );

  return (
    <>
      <PageHeader title="Launch Agent" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
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
              <form.Field
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
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="prompt">Task Description</FieldLabel>
                    <Textarea
                      id="prompt"
                      placeholder="Add a README.md file with installation instructions..."
                      className="min-h-[120px]"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldDescription>
                      Describe the task you want the agent to perform (10-5000 characters)
                    </FieldDescription>
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: e?.toString(),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Repository</FieldLegend>
            <FieldDescription>
              The GitHub repository for the agent to work on
            </FieldDescription>
            <FieldGroup>
              <form.Field
                name="source.repository"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return "Repository is required";
                    try {
                      const url = new URL(value);
                      if (url.hostname !== "github.com") {
                        return "Must be a valid GitHub repository URL";
                      }
                      if (url.pathname.split("/").length < 3) {
                        return "Must be a valid GitHub repository URL (e.g., https://github.com/owner/repo)";
                      }
                      return undefined;
                    } catch {
                      return "Please enter a valid URL";
                    }
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="repository">Repository</FieldLabel>
                    {isLoaded && hasRepositories ? (
                      <>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) =>
                            field.handleChange(value ?? "")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {repositories
                              .filter((r) => r.url.trim())
                              .map((repo) => (
                                <SelectItem key={repo.url} value={repo.url}>
                                  {repo.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          <Link
                            href="/settings"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Manage repositories
                          </Link>
                        </FieldDescription>
                      </>
                    ) : (
                      <>
                        <Input
                          id="repository"
                          placeholder="https://github.com/your-org/your-repo"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                        <FieldDescription>
                          <Link
                            href="/settings"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Add repositories in Settings for quick access
                          </Link>
                        </FieldDescription>
                      </>
                    )}
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: e?.toString(),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field 
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
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="ref">Base Branch</FieldLabel>
                    {isLoaded && branchesLoaded && hasBranches ? (
                      <>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) =>
                            field.handleChange(value ?? "")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {branches
                              .filter((b) => b.name.trim())
                              .map((branch) => (
                                <SelectItem
                                  key={branch.name}
                                  value={branch.name}
                                >
                                  {branch.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          <Link
                            href="/settings"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Manage branches
                          </Link>
                        </FieldDescription>
                      </>
                    ) : (
                      <>
                        <Input
                          id="ref"
                          placeholder="main"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldDescription>
                          The branch to base changes on (branch name, tag, or commit hash)
                        </FieldDescription>
                      </>
                    )}
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: e?.toString(),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Model Configuration</FieldLegend>
            <FieldDescription>Choose the AI model for your agent</FieldDescription>
            <FieldGroup>
              <form.Field name="model">
                {(field) => (
                  <Field>
                    <FieldLabel>AI Model</FieldLabel>
                    <Select
                      value={field.state.value || ""}
                      onValueChange={(value) => field.handleChange(value === "" ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Auto mode lets Cursor choose the best model for your task. You can also select a specific model if needed.
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Target Configuration</FieldLegend>
            <FieldDescription>Configure where and how the agent makes changes</FieldDescription>
            <FieldGroup>
              <form.Field 
                name="target.branchName"
                validators={{
                  onChange: ({ value }) =>
                    value && !/^[a-zA-Z0-9/_-]+$/.test(value)
                      ? "Branch name can only contain letters, numbers, hyphens, underscores, and forward slashes"
                      : undefined,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="branchName">
                      Target Branch (optional)
                    </FieldLabel>
                    <Input
                      id="branchName"
                      placeholder="feature/my-feature"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value || undefined)}
                    />
                    <FieldDescription>
                      Custom branch name for the agent to create. Leave empty to auto-generate.
                    </FieldDescription>
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: e?.toString(),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="target.autoCreatePr">
                {(field) => (
                  <Field orientation="horizontal">
                    <Switch
                      id="autoCreatePr"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="autoCreatePr">
                        Auto-create Pull Request
                      </FieldLabel>
                      <FieldDescription>
                        Automatically create a PR when the agent completes
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              <form.Field name="target.openAsCursorGithubApp">
                {(field) => (
                  <Field orientation="horizontal">
                    <Switch
                      id="openAsCursorGithubApp"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="openAsCursorGithubApp">
                        Open PR as Cursor GitHub App
                      </FieldLabel>
                      <FieldDescription>
                        Open the pull request as the Cursor GitHub App instead of as your user account (only applies if auto-create PR is enabled)
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              <form.Field name="target.skipReviewerRequest">
                {(field) => (
                  <Field orientation="horizontal">
                    <Switch
                      id="skipReviewerRequest"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="skipReviewerRequest">
                        Skip Adding Reviewer
                      </FieldLabel>
                      <FieldDescription>
                        Skip adding you as a reviewer to the pull request (only applies if auto-create PR is enabled and PR is opened as Cursor GitHub App)
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Webhook Configuration (Optional)</FieldLegend>
            <FieldDescription>Get notified about agent status changes</FieldDescription>
            <FieldGroup>
              <form.Field name="webhook.url">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="webhookUrl">Webhook URL</FieldLabel>
                    <Input
                      id="webhookUrl"
                      placeholder="https://your-app.com/webhooks/cursor"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value || undefined)}
                    />
                    <FieldDescription>
                      URL to receive webhook notifications about agent status changes
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>

              <form.Field 
                name="webhook.secret"
                validators={{
                  onChange: ({ value }) =>
                    value && value.length < 32
                      ? "Webhook secret must be at least 32 characters long"
                      : undefined,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="webhookSecret">Webhook Secret (Optional)</FieldLabel>
                    <Input
                      id="webhookSecret"
                      type="password"
                      placeholder="Your webhook secret (min 32 characters)"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value || undefined)}
                    />
                    <FieldDescription>
                      Secret key for webhook payload verification (minimum 32 characters)
                    </FieldDescription>
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: e?.toString(),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>
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
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={!canSubmit || isSubmitting || launchAgent.isPending}
              >
                {isSubmitting || launchAgent.isPending ? (
                  <Spinner className="h-5 w-5 mr-2" />
                ) : (
                  <Rocket className="h-5 w-5 mr-2" />
                )}
                Launch Agent
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </>
  );
}
