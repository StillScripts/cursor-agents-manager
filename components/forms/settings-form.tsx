"use client"

import {
  Check,
  GitBranch,
  Link,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription, FieldGroup, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAppForm } from "@/lib/hooks/use-app-form"
import { useBranches } from "@/lib/hooks/use-branches"
import { useRepositories } from "@/lib/hooks/use-repositories"
import type { SettingsFormData } from "@/lib/schemas/settings"

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function SettingsForm() {
  const { theme, setTheme } = useTheme()
  const { repositoriesQuery, repositoriesMutation } = useRepositories()
  const { branchesQuery, branchesMutation } = useBranches()
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRepoUrl, setNewRepoUrl] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)

  // Helper function to parse GitHub URLs
  const parseGitHubUrl = (
    url: string
  ): { url: string; name: string } | null => {
    try {
      const parsed = new URL(url.trim())
      if (parsed.hostname !== "github.com") return null

      const parts = parsed.pathname.split("/").filter(Boolean)
      if (parts.length < 2) return null

      return {
        url: url.trim(),
        name: parts[1].replace(/\.git$/, ""), // Remove .git suffix if present
      }
    } catch {
      return null
    }
  }

  // Helper function to extract owner from GitHub URL
  const getOwnerFromUrl = (url: string): string => {
    try {
      const parsed = new URL(url)
      const parts = parsed.pathname.split("/").filter(Boolean)
      return parts[0] || ""
    } catch {
      return ""
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<SettingsFormData>({
    defaultValues: {
      repositories: [],
      branches: [],
    },
    onSubmit: async ({ value }) => {
      // Filter out invalid/empty items before saving
      const validRepos = value.repositories.filter(
        (r) => r.url.trim() && r.name.trim()
      )
      const validBranches = value.branches.filter((b) => b.name.trim())

      // Ensure at least one branch exists
      const branchesToSave =
        validBranches.length > 0 ? validBranches : [{ name: "master" }]

      repositoriesMutation.mutate(validRepos)
      branchesMutation.mutate(branchesToSave)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  // Sync form with data once loaded
  useEffect(() => {
    if (repositoriesQuery.isSuccess && branchesQuery.isSuccess) {
      const repos = repositoriesQuery.data || []
      const branchList = branchesQuery.data || []
      form.setFieldValue(
        "repositories",
        repos.length > 0 ? repos : [{ url: "", name: "" }]
      )
      form.setFieldValue(
        "branches",
        branchList.length > 0 ? branchList : [{ name: "master" }]
      )
    }
  }, [
    repositoriesQuery.isSuccess,
    branchesQuery.isSuccess,
    repositoriesQuery.data,
    branchesQuery.data,
    form,
  ])

  if (!mounted || !repositoriesQuery.isSuccess || !branchesQuery.isSuccess) {
    return (
      <>
        <PageHeader title="Settings" showBack />
        <div className="p-4">
          <div className="animate-pulse flex flex-col gap-4 sm:gap-6">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" showBack />

      <div className="p-4 flex flex-col gap-4 sm:gap-6">
        {/* Theme Selection */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ToggleGroup
              value={[theme || "system"]}
              onValueChange={(values) => {
                if (values.length > 0) {
                  setTheme(values[0])
                }
              }}
              variant="outline"
              className="grid grid-cols-3 w-full"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = theme === option.value
                return (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="flex flex-col gap-2 h-auto py-3 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary"
                  >
                    <Icon
                      className="h-5 w-5"
                      fill={isActive ? "currentColor" : "none"}
                    />
                    <span className="text-xs font-medium">{option.label}</span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </CardContent>
        </Card>

        {/* Repositories */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Your Repositories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <FieldSet>
                <FieldDescription>
                  Paste GitHub URLs to quickly add repositories for agent
                  launches.
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
                                    <svg
                                      className="h-5 w-5 text-foreground"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
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
            </form>
          </CardContent>
        </Card>

        {/* Base Branches */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Base Branches
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <FieldSet>
                <FieldDescription>
                  Manage the base branches available when launching agents.
                  Defaults to master.
                </FieldDescription>

                <form.Field name="branches" mode="array">
                  {(field) => (
                    <FieldGroup className="gap-3">
                      {field.state.value.map((_, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <form.AppField
                              name={`branches[${index}].name`}
                              validators={{
                                onChange: ({ value }) =>
                                  !value?.trim()
                                    ? "Branch name is required"
                                    : undefined,
                              }}
                            >
                              {(subField) => (
                                <subField.ControlledInput
                                  field={subField}
                                  placeholder="e.g., main, develop, staging"
                                  className="h-9 text-sm"
                                />
                              )}
                            </form.AppField>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 mt-0"
                            onClick={() => field.removeValue(index)}
                            disabled={field.state.value.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => field.pushValue({ name: "" })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Branch
                      </Button>
                    </FieldGroup>
                  )}
                </form.Field>
              </FieldSet>

              <div className="mt-4">
                <Button type="submit" className="w-full">
                  {saved ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
