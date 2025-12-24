import { type NextRequest, NextResponse } from "next/server"
import { removeSimulatedAgent, getSimulatedAgents } from "@/lib/mock-data"
import { isSimulationMode, CURSOR_API_URL } from "@/lib/api-utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (isSimulationMode()) {
    const agents = getSimulatedAgents()
    const agent = agents.find((a) => a.id === id)
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    return NextResponse.json({ ...agent, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.CURSOR_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (isSimulationMode()) {
    removeSimulatedAgent(id)
    return NextResponse.json({ success: true, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.CURSOR_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return NextResponse.json({ success: true, simulation: false })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 })
  }
}
