import type { Metadata } from "next"
import { AccountScreen } from "@/components/account-screen"
import { MobileShell } from "@/components/mobile-shell"

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account and API key",
}

export default function AccountPage() {
  return (
    <MobileShell>
      <AccountScreen />
    </MobileShell>
  )
}
