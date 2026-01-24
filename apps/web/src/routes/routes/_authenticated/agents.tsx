import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { AgentsTable } from "@/app/(authenticated)/_components/agents-table"

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "Your Agents | Cursor Agents" },
      { name: "description", content: "Monitor and manage your Cursor background agents on the go" },
    ],
  }),
  component: AgentsPage,
})

function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentsTable />
    </Suspense>
  )
}
