import type { Metadata } from "next"
import { Suspense } from "react"
import { AgentsTable } from "@/app/(authenticated)/_components/agents-table"

export const metadata: Metadata = {
  title: "Your Agents",
  description: "Monitor and manage your Cursor background agents on the go",
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <AgentsTable />
    </Suspense>
  )
}
