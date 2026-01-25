import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { PageHeader } from "@/components/app/authenticated/page-header"
import { ThemeSelector } from "@/components/app/authenticated/settings/theme-selector"
import { BranchesFormContainer } from "@/components/forms/branches-form"
import { RepositoriesFormContainer } from "@/components/forms/repositories-form"

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Cursor Agents" },
      {
        name: "description",
        content: "Configure your repositories and branches",
      },
    ],
  }),
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <div className="p-4 flex flex-col gap-4 sm:gap-6">
        <PageHeader title="Settings" showBack />
        <ThemeSelector />
        <RepositoriesFormContainer />
        <BranchesFormContainer />
      </div>
    </Suspense>
  )
}
