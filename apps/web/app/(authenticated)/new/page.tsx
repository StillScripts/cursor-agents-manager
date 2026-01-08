import type { Metadata } from "next"
import { Suspense } from "react"
import { LaunchAgentForm } from "@/components/forms/launch-agent-form"

export const metadata: Metadata = {
  title: "Launch New Agent",
  description: "Start a new Cursor background agent",
}

export default function NewAgentPage() {
  return (
    <Suspense fallback={null}>
      <LaunchAgentForm />
    </Suspense>
  )
}
