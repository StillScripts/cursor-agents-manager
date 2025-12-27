import { LaunchAgentForm } from "@/components/launch-agent-form"
import { MobileShell } from "@/components/mobile-shell"

export const dynamic = "force-dynamic"

export default function NewAgentPage() {
  return (
    <MobileShell>
      <LaunchAgentForm />
    </MobileShell>
  )
}
