import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { CursorApiKeyManager } from "@/app/(authenticated)/account/_components/cursor-api-key-manager"
import { DeleteAccountButton } from "@/app/(authenticated)/account/_components/delete-account-button"
import { GithubTokenManager } from "@/app/(authenticated)/account/_components/github-token-manager"
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
        <CursorApiKeyManager />
        <OpenAIApiKeyManager />
        <GithubTokenManager />
        <SettingsLinkCard />
        <div className="flex flex-col gap-2 pt-4 border-t">
          <SignOutButton />
          <DeleteAccountButton />
        </div>
        <p className="text-xs text-center text-muted-foreground pt-4">
          Cursor Agent Manager v0.1.0
        </p>
      </div>
    </Suspense>
  )
}
