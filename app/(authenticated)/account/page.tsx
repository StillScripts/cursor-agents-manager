import type { Metadata } from "next"
import { Suspense } from "react"
import { AccountScreen } from "@/app/(authenticated)/account/_components/account-screen"

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your account and API key",
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountScreen />
    </Suspense>
  )
}
