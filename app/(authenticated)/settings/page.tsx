import type { Metadata } from "next"
import { Suspense } from "react"
import { SettingsForm } from "@/components/settings-form"

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your repositories and branches",
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsForm />
    </Suspense>
  )
}
