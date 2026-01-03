import type { Metadata } from "next"
import { AgentDetail } from "@/components/agent-detail"
import { getAgentConversationData, getAgentData } from "@/lib/server/agents"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Agent Details",
  description: "View agent conversation and status",
}

// ISR: Revalidate once per day (86400 seconds)
export const revalidate = 86400

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params

  // Fetch initial data on the server
  const [agent, conversation] = await Promise.all([
    getAgentData(id),
    getAgentConversationData(id),
  ])

  return (
    <AgentDetail
      agentId={id}
      initialAgent={agent}
      initialConversation={conversation}
    />
  )
}
