import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { DeleteAccountButton } from "@/app/(authenticated)/account/_components/delete-account-button"
import { SignOutButton } from "@/app/(authenticated)/account/_components/sign-out-button"
import { ThemeSelector } from "@/app/(authenticated)/settings/_components/theme-selector"
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
        <ThemeSelector />
        <RepositoriesFormContainer />
        <BranchesFormContainer />
        <div className="flex flex-col gap-2 pt-4 border-t">
          <SignOutButton />
          <DeleteAccountButton />
        </div>
      </div>
    </Suspense>
  )
}
