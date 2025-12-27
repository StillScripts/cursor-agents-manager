import { type NextRequest, NextResponse } from "next/server"
import {
  CURSOR_API_URL,
  getUserApiKey,
  isSimulationMode,
} from "@/lib/api-utils"
import { getSimulatedAgents, removeSimulatedAgent } from "@/lib/mock-data"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const simMode = await isSimulationMode(request)

  if (simMode) {
    const agents = getSimulatedAgents()
    const agent = agents.find((a) => a.id === id)
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    return NextResponse.json({ ...agent, simulation: true })
  }

  try {
    const apiKey = await getUserApiKey(request)
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 }
      )
    }

    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const simMode = await isSimulationMode(request)

  if (simMode) {
    removeSimulatedAgent(id)
    return NextResponse.json({ success: true, simulation: true })
  }

  try {
    const apiKey = await getUserApiKey(request)
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 }
      )
    }

    const response = await fetch(`${CURSOR_API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return NextResponse.json({ success: true, simulation: false })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    )
  }
}
