import { type NextRequest, NextResponse } from "next/server"
import {
  CURSOR_API_URL,
  getUserApiKey,
  isSimulationMode,
} from "@/lib/api-utils"
import { getSimulatedConversation } from "@/lib/mock-data"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const simMode = await isSimulationMode(request)

  if (simMode) {
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
    const apiKey = await getUserApiKey(request)
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 }
      )
    }

    const response = await fetch(`${CURSOR_API_URL}/${id}/conversation`, {
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
    console.error("Error fetching conversation:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}
