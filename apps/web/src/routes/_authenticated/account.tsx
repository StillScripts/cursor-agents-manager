import { createFileRoute } from "@tanstack/react-router"
import { CursorApiKeyManager } from "@/components/app/authenticated/account/cursor-api-key-manager"
import { DeleteAccountButton } from "@/components/app/authenticated/account/delete-account-button"
import { GithubTokenManager } from "@/components/app/authenticated/account/github-token-manager"
import { OpenAIApiKeyManager } from "@/components/app/authenticated/account/openai-api-key-manager"
import { SettingsLinkCard } from "@/components/app/authenticated/account/settings-link-card"
import { SignOutButton } from "@/components/app/authenticated/account/sign-out-button"
import { UserProfileCard } from "@/components/app/authenticated/account/user-profile-card"
import { PageHeader } from "@/components/app/authenticated/page-header"

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account | Cursor Agents" },
      { name: "description", content: "Manage your account and API key" },
    ],
  }),
  component: AccountPage,
})

function AccountPage() {
  return (

  )
}
