import type { Metadata } from "next"
import { Suspense } from "react"
import { AgentDetail } from "@/components/agent-detail"
import { getAgentConversationData, getAgentData } from "@/lib/server/agents"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Agent Details",
  description: "View agent conversation and status",
}

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params

  const [agent, conversation] = await Promise.all([
    getAgentData(id),
    getAgentConversationData(id),
  ])

  return (
    <Suspense fallback={null}>
      <AgentDetail
        agentId={id}
        initialAgent={agent}
        initialConversation={conversation}
      />
    </Suspense>
  )
}
