import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { AgentDetail } from "@/app/(authenticated)/agent/_components/agent-detail"

export const Route = createFileRoute("/_authenticated/agents/$id")({
  head: () => ({
    meta: [
      { title: "Agent Details | Cursor Agents" },
      { name: "description", content: "View agent conversation and status" },
    ],
  }),
  component: AgentPage,
})

function AgentPage() {
  const { id } = Route.useParams()
  return (
    <Suspense fallback={null}>
      <AgentDetail agentId={id} initialAgent={null} />
    </Suspense>
  )
}
