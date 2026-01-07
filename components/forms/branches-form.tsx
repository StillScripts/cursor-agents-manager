"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription, FieldGroup, FieldSet } from "@/components/ui/field"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { type Branch, useBranches } from "@/lib/hooks/use-branches"
import {
  type BranchFormData,
  branchesRequestSchema,
} from "@/lib/validators/settings"

type BranchesFormData = {
  branches: BranchFormData[]
}

function BranchesForm({
  initialBranches,
  onSaveBranches,
}: {
  initialBranches: Branch[]
  onSaveBranches: (branches: Branch[]) => Promise<unknown>
}) {
  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<BranchesFormData>({
    defaultValues: {
      branches:
        initialBranches.length > 0 ? initialBranches : [{ name: "master" }],
    },
    validators: {
      onSubmit: branchesRequestSchema,
    },
    onSubmit: async ({ value }) => {
      const validBranches = value.branches.filter((b) => b.name.trim())

      const branchesToSave =
        validBranches.length > 0 ? validBranches : [{ name: "master" }]

      await onSaveBranches(branchesToSave)
    },
  })

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Base Branches</CardTitle>
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
              <form.SubscribeButton
                formId={form.formId}
                label="Save Branches"
                className="w-full"
              />
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}

export function BranchesFormContainer() {
  const { branches, isLoading: isLoadingBranches, saveBranches } = useBranches()

  if (isLoadingBranches) {
    return <SkeletonCard />
  }

  return (
    <BranchesForm
      initialBranches={branches ?? []}
      onSaveBranches={saveBranches}
    />
  )
}
