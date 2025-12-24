import { type NextRequest, NextResponse } from "next/server"
import { getSimulatedConversation } from "@/lib/mock-data"
import { isSimulationMode, CURSOR_API_URL } from "@/lib/api-utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (isSimulationMode()) {
    const conversation = getSimulatedConversation(id)
    if (!conversation) {
      return NextResponse.json({
        id,
        messages: [
          {
            id: "msg_placeholder",
            type: "user_message",
            text: "No conversation history available for this simulated agent.",
          },
        ],
        simulation: true,
      })
    }
    return NextResponse.json({ ...conversation, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/conversation`, {
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
    console.error("Error fetching conversation:", error)
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
  }
}
