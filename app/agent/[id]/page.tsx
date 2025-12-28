import type { Metadata } from "next"
import { AgentDetail } from "@/components/agent-detail"
import { MobileShell } from "@/components/mobile-shell"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Agent Details",
  description: "View agent conversation and status",
}

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params

  return (
    <MobileShell>
      <AgentDetail agentId={id} />
    </MobileShell>
  )
}
