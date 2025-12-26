import { type NextRequest, NextResponse } from "next/server"
import { updateSimulatedAgentStatus } from "@/lib/mock-data"
import { isSimulationMode, getUserApiKey, CURSOR_API_URL } from "@/lib/api-utils"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const simMode = await isSimulationMode(request)

  if (simMode) {
    updateSimulatedAgentStatus(id, "FINISHED")
    return NextResponse.json({ success: true, simulation: true })
  }

  try {
    const apiKey = await getUserApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 401 })
    }

    const response = await fetch(`${CURSOR_API_URL}/${id}/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return NextResponse.json({ success: true, simulation: false })
  } catch (error) {
    console.error("Error stopping agent:", error)
    return NextResponse.json({ error: "Failed to stop agent" }, { status: 500 })
  }
}
