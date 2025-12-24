import { type NextRequest, NextResponse } from "next/server"
import { updateSimulatedAgentStatus } from "@/lib/mock-data"
import { isSimulationMode, CURSOR_API_URL } from "@/lib/api-utils"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (isSimulationMode()) {
    updateSimulatedAgentStatus(id, "FINISHED")
    return NextResponse.json({ success: true, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CURSOR_API_KEY}`,
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
