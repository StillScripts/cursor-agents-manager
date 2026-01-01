import type { Metadata } from "next"
import { AgentsTable } from "@/components/agents-table"

export const metadata: Metadata = {
  title: "Your Agents",
  description: "Monitor and manage your Cursor background agents on the go",
}

export default function HomePage() {
  return <AgentsTable />
}
