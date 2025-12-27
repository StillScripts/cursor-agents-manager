import { AgentsTable } from "@/components/agents-table"
import { MobileShell } from "@/components/mobile-shell"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <MobileShell>
      <AgentsTable />
    </MobileShell>
  )
}
