import { createFileRoute } from "@tanstack/react-router"
import { AgentDetail } from "@/components/app/authenticated/agent/agent-detail"

export const Route = createFileRoute("/_authenticated/agent/$id")({
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

  return <AgentDetail agentId={id} initialAgent={null} />
}
