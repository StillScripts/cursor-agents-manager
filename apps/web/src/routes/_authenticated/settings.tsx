import { createFileRoute } from "@tanstack/react-router"
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

  )
}
