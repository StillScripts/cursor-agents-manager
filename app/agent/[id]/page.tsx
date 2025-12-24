import { MobileShell } from "@/components/mobile-shell"
import { AgentDetail } from "@/components/agent-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params

  return (
    <MobileShell>
      <AgentDetail agentId={id} />
    </MobileShell>
  )
}
