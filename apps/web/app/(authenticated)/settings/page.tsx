import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { ThemeSelector } from "@/app/(authenticated)/settings/_components/theme-selector"
import { PushNotificationsToggle } from "@/app/(authenticated)/settings/_components/push-notifications-toggle"
import { BranchesFormContainer } from "@/components/forms/branches-form"
import { RepositoriesFormContainer } from "@/components/forms/repositories-form"

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your repositories and branches",
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <div className="p-4 flex flex-col gap-4 sm:gap-6">
        <PageHeader title="Settings" showBack />
        <PushNotificationsToggle />
        <ThemeSelector />
        <RepositoriesFormContainer />
        <BranchesFormContainer />
      </div>
    </Suspense>
  )
}
