"use client"

import { useTheme } from "next-themes"
import { useForm } from "@tanstack/react-form"
import { useRepositories, type Repository } from "@/lib/hooks/use-repositories"
import { useBranches } from "@/lib/hooks/use-branches"
import { PageHeader } from "./page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldSet } from "@/components/ui/field"
import { Sun, Moon, Monitor, Plus, Trash2, Check } from "lucide-react"
import { useEffect, useState } from "react"

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

interface RepoFormValues {
  repositories: Repository[]
  branches: Array<{ name: string }>
}

export function SettingsForm() {
  const { theme, setTheme } = useTheme()
  const { repositories, isLoaded, saveRepositories } = useRepositories()
  const { branches, isLoaded: branchesLoaded, saveBranches } = useBranches()
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<RepoFormValues>({
    defaultValues: {
      repositories: [],
      branches: [],
    },
    onSubmit: async ({ value }) => {
      const validRepos = value.repositories.filter((r) => r.url.trim() && r.name.trim())
      const validBranches = value.branches.filter((b) => b.name.trim())
      saveRepositories(validRepos)
      saveBranches(validBranches.length > 0 ? validBranches : [{ name: "master" }])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  // Sync form with localStorage once loaded
  useEffect(() => {
    if (isLoaded && branchesLoaded) {
      form.setFieldValue("repositories", repositories.length > 0 ? repositories : [{ url: "", name: "" }])
      form.setFieldValue("branches", branches.length > 0 ? branches : [{ name: "master" }])
    }
  }, [isLoaded, branchesLoaded, repositories, branches, form])

  if (!mounted || !isLoaded || !branchesLoaded) {
    return (
      <>
        <PageHeader title="Settings" showBack />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
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

      <div className="p-4 space-y-4">
        {/* Theme Selection */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = theme === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      isActive ? "border-primary bg-primary/10" : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Repositories */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Your Repositories</CardTitle>
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
                  Add your GitHub repositories to quickly select them when launching agents.
                </FieldDescription>

                <form.Field name="repositories" mode="array">
                  {(field) => (
                    <FieldGroup className="gap-3">
                      {field.state.value.map((_, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                            <form.Field
                              name={`repositories[${index}].name`}
                              validators={{
                                onChange: ({ value }) => (!value?.trim() ? "Name is required" : undefined),
                              }}
                            >
                              {(subField) => (
                                <Field data-invalid={subField.state.meta.errors.length > 0}>
                                  <Input
                                    placeholder="Repository name"
                                    value={subField.state.value || ""}
                                    onChange={(e) => subField.handleChange(e.target.value)}
                                    onBlur={subField.handleBlur}
                                    className="h-9 text-sm"
                                  />
                                </Field>
                              )}
                            </form.Field>
                            <form.Field
                              name={`repositories[${index}].url`}
                              validators={{
                                onChange: ({ value }) => {
                                  if (!value?.trim()) return "URL is required"
                                  if (!value.includes("github.com")) return "Must be a GitHub URL"
                                  return undefined
                                },
                              }}
                            >
                              {(subField) => (
                                <Field data-invalid={subField.state.meta.errors.length > 0}>
                                  <Input
                                    placeholder="https://github.com/org/repo"
                                    value={subField.state.value || ""}
                                    onChange={(e) => subField.handleChange(e.target.value)}
                                    onBlur={subField.handleBlur}
                                    className="h-9 text-sm"
                                  />
                                  <FieldError
                                    errors={subField.state.meta.errors.map((e) => ({
                                      message: e?.toString(),
                                    }))}
                                  />
                                </Field>
                              )}
                            </form.Field>
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
                        onClick={() => field.pushValue({ url: "", name: "" })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Repository
                      </Button>
                    </FieldGroup>
                  )}
                </form.Field>
              </FieldSet>
            </form>
          </CardContent>
        </Card>

        {/* Base Branches */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Base Branches</CardTitle>
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
                  Manage the base branches available when launching agents. Defaults to master.
                </FieldDescription>

                <form.Field name="branches" mode="array">
                  {(field) => (
                    <FieldGroup className="gap-3">
                      {field.state.value.map((_, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <form.Field
                              name={`branches[${index}].name`}
                              validators={{
                                onChange: ({ value }) => (!value?.trim() ? "Branch name is required" : undefined),
                              }}
                            >
                              {(subField) => (
                                <Field data-invalid={subField.state.meta.errors.length > 0}>
                                  <Input
                                    placeholder="e.g., main, develop, staging"
                                    value={subField.state.value || ""}
                                    onChange={(e) => subField.handleChange(e.target.value)}
                                    onBlur={subField.handleBlur}
                                    className="h-9 text-sm"
                                  />
                                  <FieldError
                                    errors={subField.state.meta.errors.map((e) => ({
                                      message: e?.toString(),
                                    }))}
                                  />
                                </Field>
                              )}
                            </form.Field>
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
