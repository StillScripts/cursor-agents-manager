import type { Metadata } from "next"
import { AgentDetail } from "@/components/agent-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Agent Details",
  description: "View agent conversation and status",
}

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params

  return <AgentDetail agentId={id} />
}
