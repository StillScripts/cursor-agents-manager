import type { Metadata } from "next"
import { LaunchAgentForm } from "@/components/forms/launch-agent-form"
import { MobileShell } from "@/components/mobile-shell"

export const metadata: Metadata = {
  title: "Launch New Agent",
  description: "Start a new Cursor background agent",
}

export default function NewAgentPage() {
  return (
    <MobileShell>
      <LaunchAgentForm />
    </MobileShell>
  )
}
