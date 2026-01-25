import { parseGitHubUrl } from "helpers"
import { GitBranch, Link, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  type RepositoryFormData,
  repositoriesRequestSchema,
} from "validators/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription, FieldGroup, FieldSet } from "@/components/ui/field"
import { GithubIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { type Repository, useRepositories } from "@/lib/hooks/use-repositories"

type RepositoriesFormData = {
  repositories: RepositoryFormData[]
}

function RepositoriesForm({
  initialRepositories,
  onSaveRepositories,
}: {
  initialRepositories: Repository[]
  onSaveRepositories: (repos: Repository[]) => Promise<unknown>
}) {
  const [newRepoUrl, setNewRepoUrl] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)

  const getOwnerFromUrl = (url: string): string => {
    try {
      const parsed = new URL(url)
      const parts = parsed.pathname.split("/").filter(Boolean)
      return parts[0] || ""
    } catch {
      return ""
    }
  }

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<RepositoriesFormData>({
    defaultValues: {
      repositories: initialRepositories,
    },
    validators: {
      onSubmit: repositoriesRequestSchema,
    },
    onSubmit: async ({ value }) => {
      const validRepos = value.repositories.filter(
        (r) => r.url.trim() && r.name.trim()
      )
      // @ts-expect-error likely needs more refining
      await onSaveRepositories(validRepos)
    },
  })

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Your Repositories
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <FormProvider value={form}>
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            <FieldSet>
              <FieldDescription>
                Paste GitHub URLs to quickly add project codebases you want to
                use for agent launches.
              </FieldDescription>

              <form.Field name="repositories" mode="array">
                {(field) => {
                  const repositories = field.state.value || []

                  const handleAdd = () => {
                    if (!newRepoUrl.trim()) return

                    const parsed = parseGitHubUrl(newRepoUrl)
                    if (!parsed) {
                      setParseError(
                        "Please enter a valid GitHub repository URL"
                      )
                      return
                    }

                    if (repositories.some((r) => r.url === parsed.url)) {
                      setParseError("This repository has already been added")
                      return
                    }

                    field.pushValue(parsed)
                    setNewRepoUrl("")
                    setParseError(null)
                  }

                  return (
                    <FieldGroup className="gap-4">
                      {/* Input section */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Paste GitHub URL..."
                              value={newRepoUrl}
                              onChange={(e) => {
                                setNewRepoUrl(e.target.value)
                                setParseError(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleAdd()
                                }
                              }}
                              className="pl-9"
                            />
                          </div>
                          <Button type="button" onClick={handleAdd} size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        {parseError && (
                          <p className="text-sm text-destructive">
                            {parseError}
                          </p>
                        )}
                      </div>

                      {/* Repository list */}
                      {repositories.length > 0 && (
                        <div className="space-y-2">
                          {repositories.map((repo, index) => {
                            const owner = getOwnerFromUrl(repo.url)
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                                  <GithubIcon />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {repo.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {owner}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() => field.removeValue(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Count */}
                      {repositories.length > 0 && (
                        <p className="text-sm text-center text-muted-foreground">
                          {repositories.length}{" "}
                          {repositories.length === 1
                            ? "repository"
                            : "repositories"}{" "}
                          saved
                        </p>
                      )}
                    </FieldGroup>
                  )
                }}
              </form.Field>
            </FieldSet>

            <div className="mt-6">
              <form.SubscribeButton
                formId={form.formId}
                label="Save Repositories"
                className="w-full"
              />
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}

export function RepositoriesFormContainer() {
  const {
    repositories,
    isLoading: isLoadingRepos,
    saveRepositories,
  } = useRepositories()

  if (isLoadingRepos) {
    return <SkeletonCard />
  }

  return (
    <RepositoriesForm
      initialRepositories={repositories ?? []}
      onSaveRepositories={saveRepositories}
    />
  )
}
