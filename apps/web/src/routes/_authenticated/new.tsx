import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { LaunchAgentForm } from "@/components/forms/launch-agent-form"

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "Launch New Agent | Cursor Agents" },
      { name: "description", content: "Start a new Cursor background agent" },
    ],
  }),
  component: NewAgentPage,
})

function NewAgentPage() {
  return (
    <Suspense fallback={null}>
      <LaunchAgentForm />
    </Suspense>
  )
}
