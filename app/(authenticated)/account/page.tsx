import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { ApiKeyManager } from "@/app/(authenticated)/account/_components/api-key-manager"
import { OpenAIApiKeyManager } from "@/app/(authenticated)/account/_components/openai-api-key-manager"
import { SettingsLinkCard } from "@/app/(authenticated)/account/_components/settings-link-card"
import { SignOutButton } from "@/app/(authenticated)/account/_components/sign-out-button"
import { UserProfileCard } from "@/app/(authenticated)/account/_components/user-profile-card"

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account and API key",
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <div className="p-4 flex flex-col gap-4 sm:gap-6">
        <PageHeader title="Account" />
        <UserProfileCard />
        <ApiKeyManager />
        <OpenAIApiKeyManager />
        <SettingsLinkCard />
        <SignOutButton />
        <p className="text-xs text-center text-muted-foreground pt-4">
          Cursor Agent Manager v1.0.0
        </p>
      </div>
    </Suspense>
  )
}
