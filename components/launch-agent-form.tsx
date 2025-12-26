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
import { Rocket, Settings, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

const models = [
  { value: "claude-4-sonnet", label: "Claude 4 Sonnet" },
  { value: "claude-4-opus", label: "Claude 4 Opus" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

interface FormValues {
  prompt: string;
  repository: string;
  ref: string;
  model: string;
  branchName: string;
  autoCreatePr: boolean;
}

export function LaunchAgentForm() {
  const router = useRouter();
  const launchAgent = useLaunchAgent();
  const { repositories, isLoaded } = useRepositories();
  const { branches, isLoaded: branchesLoaded } = useBranches();

  const form = useForm({
    defaultValues: {
      prompt: "",
      repository: "",
      ref: "main",
      model: "claude-4-sonnet",
      branchName: "",
      autoCreatePr: true,
    },
    onSubmit: async ({ value }) => {
      await launchAgent.mutateAsync({
        prompt: { text: value.prompt },
        source: {
          repository: value.repository,
          ref: value.ref,
        },
        model: value.model,
        target: {
          branchName: value.branchName || undefined,
          autoCreatePr: value.autoCreatePr,
        },
      });
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
                name="prompt"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Please describe the task" : undefined,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="prompt">Prompt</FieldLabel>
                    <Textarea
                      id="prompt"
                      placeholder="Add a README.md file with installation instructions..."
                      className="min-h-[120px]"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
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
                name="repository"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Repository is required"
                      : !value.includes("github.com")
                      ? "Must be a valid GitHub URL"
                      : undefined,
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

              <form.Field name="ref">
                {(field) => (
                  <Field>
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
                          The branch to base changes on
                        </FieldDescription>
                      </>
                    )}
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Configuration</FieldLegend>
            <FieldDescription>Optional agent settings</FieldDescription>
            <FieldGroup>
              <form.Field name="model">
                {(field) => (
                  <Field>
                    <FieldLabel>Model</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>

              <form.Field name="branchName">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="branchName">
                      Target Branch (optional)
                    </FieldLabel>
                    <Input
                      id="branchName"
                      placeholder="feature/my-feature"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldDescription>
                      Leave empty to auto-generate
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>

              <form.Field name="autoCreatePr">
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
                        Automatically create a PR when finished
                      </FieldDescription>
                    </FieldContent>
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
