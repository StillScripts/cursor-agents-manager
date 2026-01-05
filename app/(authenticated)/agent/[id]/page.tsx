import type { Metadata } from "next"
import { Suspense } from "react"
import { AgentDetail } from "@/app/(authenticated)/agent/_components/agent-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Agent Details",
  description: "View agent conversation and status",
}

export default async function AgentPage({ params }: PageProps) {
  const { id } = await params

  // Remove server-side data fetching - let the client component handle it via Convex
  // This avoids hitting the old Hono API routes
  return (
    <Suspense fallback={null}>
      <AgentDetail
        agentId={id}
        initialAgent={null}
        initialConversation={null}
      />
    </Suspense>
  )
}
