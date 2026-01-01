import type { Metadata } from "next"
import { AccountScreen } from "@/components/account-screen"

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account and API key",
}

export default function AccountPage() {
  return <AccountScreen />
}
